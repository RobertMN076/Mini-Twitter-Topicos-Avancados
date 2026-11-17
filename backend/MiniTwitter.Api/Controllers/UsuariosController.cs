
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MiniTwitter.Api.DTOs;
using MiniTwitter.Api.Models;

namespace MiniTwitter.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/usuarios")]
public class UsuariosController : ControllerBase
{
    private readonly UserManager<Usuario> _userManager;

    public UsuariosController(UserManager<Usuario> userManager)
    {
        _userManager = userManager;
    }

    private async Task<Usuario?> ObterUsuarioAtual()
    {
        var id = User.FindFirst(
            JwtRegisteredClaimNames.Sub)?.Value;

        if (!Guid.TryParse(id, out var usuarioId))
            return null;

        return await _userManager.FindByIdAsync(
            usuarioId.ToString());
    }


    [HttpPut("me")]
    public async Task<IActionResult> AtualizarPerfil(
        [FromBody] AtualizarPerfilDto dto)
    {
        var usuario = await ObterUsuarioAtual();

        if (usuario == null)
            return Unauthorized();

        usuario.Nome = dto.Nome.Trim();
        usuario.UserName = dto.NomeUsuario.Trim();
        usuario.Email = dto.Email.Trim();

        var resultado = await _userManager.UpdateAsync(usuario);

        if (!resultado.Succeeded)
        {
            return BadRequest(new
            {
                erros = resultado.Errors
                    .Select(e => e.Description)
            });
        }

        return Ok(new
        {
            mensagem = "Perfil atualizado com sucesso!"
        });
    }


    [HttpPut("me/senha")]
    public async Task<IActionResult> AlterarSenha(
        [FromBody] AlterarSenhaDto dto)
    {
        var usuario = await ObterUsuarioAtual();

        if (usuario == null)
            return Unauthorized();

        var resultado = await _userManager.ChangePasswordAsync(
            usuario,
            dto.SenhaAtual,
            dto.NovaSenha
        );

        if (!resultado.Succeeded)
        {
            return BadRequest(new
            {
                erros = resultado.Errors
                    .Select(e => e.Description)
            });
        }

        return Ok(new
        {
            mensagem = "Senha alterada com sucesso!"
        });
    }


    [HttpDelete("me")]
    public async Task<IActionResult> ExcluirConta(
        [FromBody] ExcluirContaDto dto)
    {
        var usuario = await ObterUsuarioAtual();

        if (usuario == null)
            return Unauthorized();

        var senhaValida = await _userManager.CheckPasswordAsync(
            usuario, dto.Senha
        );

        if (!senhaValida)
        {
            return BadRequest(new
            {
                mensagem = "Senha incorreta."
            });
        }

        var resultado = await _userManager.DeleteAsync(usuario);

        if (!resultado.Succeeded)
        {
            return BadRequest(new
            {
                erros = resultado.Errors
                    .Select(e => e.Description)
            });
        }

        return NoContent();
    }
}
