
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniTwitter.Api.Data;
using MiniTwitter.Api.DTOs;
using MiniTwitter.Api.Models;

namespace MiniTwitter.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/postagens")]
public class PostagensController : ControllerBase
{
    private readonly AppDbContext _context;
    private const long MaxImagem = 5 * 1024 * 1024;

    public PostagensController(AppDbContext context)
    {
        _context = context;
    }

    private Guid? UsuarioAtualId()
    {
        return Guid.TryParse(User.FindFirst("sub")?.Value, out var id)
            ? id
            : null;
    }


    private static string? DetectarTipo(byte[] dados)
    {
        if (dados.Length >= 8 &&
            dados.AsSpan(0, 8).SequenceEqual(
                new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
        {
            return "image/png";
        }

        if (dados.Length >= 3 &&
            dados[0] == 0xFF &&
            dados[1] == 0xD8 &&
            dados[2] == 0xFF)
        {
            return "image/jpeg";
        }

        if (dados.Length >= 12 &&
            dados.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
            dados.AsSpan(8, 4).SequenceEqual("WEBP"u8))
        {
            return "image/webp";
        }

        return null;
    }

    private static async Task<(byte[]? Dados, string? Tipo, string? Erro)>
        LerImagem(IFormFile imagem)
    {
        if (imagem.Length == 0 || imagem.Length > MaxImagem)
        {
            return (null, null, "A imagem deve ter até 5 MB.");
        }

        using var memoria = new MemoryStream();
        await imagem.CopyToAsync(memoria);

        var dados = memoria.ToArray();
        var tipo = DetectarTipo(dados);

        if (tipo == null)
        {
            return (null, null,
                "Formato inválido. Use JPG, PNG ou WebP.");
        }

        return (dados, tipo, null);
    }


    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var postagens = await _context.Postagens
            .AsNoTracking()
            .OrderByDescending(p => p.CriadoEm)
            .ThenByDescending(p => p.Id)
            .Take(50)
            .Select(p => new
            {
                p.Id,
                p.Texto,
                p.CriadoEm,
                p.AutorId,
                AutorNome = p.Autor.Nome,
                AutorUserName = p.Autor.UserName,
                TemImagem = p.ImagemDados != null
            })
            .ToListAsync();

        return Ok(postagens);
    }


    [HttpGet("{id:guid}/imagem")]
    public async Task<IActionResult> ObterImagem(Guid id)
    {
        var postagem = await _context.Postagens
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.ImagemDados,
                p.ImagemTipo
            })
            .FirstOrDefaultAsync();

        if (postagem?.ImagemDados == null ||
            postagem.ImagemTipo == null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "private, no-store";

        return File(
            postagem.ImagemDados,
            postagem.ImagemTipo
        );
    }


    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Criar(
        [FromForm] PostagemFormDto dto)
    {
        var usuarioId = UsuarioAtualId();

        if (usuarioId == null)
            return Unauthorized();

        var texto = dto.Texto?.Trim() ?? "";

        if (texto.Length > 280)
            return BadRequest(new
            {
                mensagem = "O limite é 280 caracteres."
            });

        if (texto.Length == 0 && dto.Imagem == null)
            return BadRequest(new
            {
                mensagem = "Escreva um texto ou selecione uma imagem."
            });

        byte[]? dadosImagem = null;
        string? tipoImagem = null;

        if (dto.Imagem != null)
        {
            var imagem = await LerImagem(dto.Imagem);

            if (imagem.Erro != null)
                return BadRequest(new { mensagem = imagem.Erro });

            dadosImagem = imagem.Dados;
            tipoImagem = imagem.Tipo;
        }

        var postagem = new Postagem
        {
            Texto = texto,
            AutorId = usuarioId.Value,
            CriadoEm = DateTime.UtcNow,
            ImagemDados = dadosImagem,
            ImagemTipo = tipoImagem
        };

        _context.Postagens.Add(postagem);
        await _context.SaveChangesAsync();

        return StatusCode(201, new
        {
            mensagem = "Postagem criada com sucesso!",
            postagem.Id
        });
    }


    [HttpPut("{id:guid}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Editar(
        Guid id,
        [FromForm] PostagemFormDto dto)
    {
        var usuarioId = UsuarioAtualId();

        if (usuarioId == null)
            return Unauthorized();

        var postagem = await _context.Postagens
            .FirstOrDefaultAsync(p => p.Id == id);

        if (postagem == null)
            return NotFound(new
            {
                mensagem = "Postagem não encontrada."
            });

        if (postagem.AutorId != usuarioId.Value)
            return Forbid();

        if (dto.Imagem != null && dto.RemoverImagem)
            return BadRequest(new
            {
                mensagem = "Escolha entre substituir ou remover a imagem."
            });

        var texto = dto.Texto?.Trim() ?? "";

        if (texto.Length > 280)
            return BadRequest(new
            {
                mensagem = "O limite é 280 caracteres."
            });

        bool teraImagem = dto.Imagem != null ||
            (!dto.RemoverImagem && postagem.ImagemDados != null);

        if (texto.Length == 0 && !teraImagem)
            return BadRequest(new
            {
                mensagem = "A postagem precisa de texto ou imagem."
            });

        if (dto.Imagem != null)
        {
            var imagem = await LerImagem(dto.Imagem);

            if (imagem.Erro != null)
                return BadRequest(new { mensagem = imagem.Erro });

            postagem.ImagemDados = imagem.Dados;
            postagem.ImagemTipo = imagem.Tipo;
        }
        else if (dto.RemoverImagem)
        {
            postagem.ImagemDados = null;
            postagem.ImagemTipo = null;
        }

        postagem.Texto = texto;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensagem = "Postagem atualizada com sucesso!"
        });
    }


    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Excluir(Guid id)
    {
        var usuarioId = UsuarioAtualId();

        if (usuarioId == null)
            return Unauthorized();

        var postagem = await _context.Postagens
            .FirstOrDefaultAsync(p => p.Id == id);

        if (postagem == null)
            return NotFound();

        if (postagem.AutorId != usuarioId.Value)
            return Forbid();

        _context.Postagens.Remove(postagem);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
