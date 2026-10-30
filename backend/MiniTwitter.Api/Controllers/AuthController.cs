
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using MiniTwitter.Api.DTOs;
using MiniTwitter.Api.Models;

namespace MiniTwitter.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<Usuario> _userManager;
    private readonly SignInManager<Usuario> _signInManager;
    private readonly IConfiguration _config;

    public AuthController(
        UserManager<Usuario> userManager,
        SignInManager<Usuario> signInManager,
        IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _config = config;
    }

    [HttpPost("cadastro")]
    public async Task<IActionResult> Cadastro(
        [FromBody] CadastroDto dto)
    {
        var usuario = new Usuario
        {
            Nome = dto.Nome.Trim(),
            UserName = dto.NomeUsuario.Trim(),
            Email = dto.Email.Trim()
        };

        var resultado = await _userManager.CreateAsync(
            usuario, dto.Senha);

        if (!resultado.Succeeded)
        {
            return BadRequest(new
            {
                erros = resultado.Errors
                    .Select(e => e.Description)
            });
        }

        return StatusCode(201, new
        {
            mensagem = "Usuário cadastrado com sucesso!"
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginDto dto)
    {
        var usuario = await _userManager.FindByEmailAsync(
            dto.Email.Trim());

        if (usuario == null)
            return Unauthorized(new
            {
                mensagem = "Email ou senha inválidos."
            });

        var resultado =
            await _signInManager.CheckPasswordSignInAsync(
                usuario,
                dto.Senha,
                lockoutOnFailure: true
            );

        if (resultado.IsLockedOut)
            return StatusCode(429, new
            {
                mensagem = "Conta temporariamente bloqueada."
            });

        if (!resultado.Succeeded)
            return Unauthorized(new
            {
                mensagem = "Email ou senha inválidos."
            });

        var claims = new[]
        {
            new Claim(
                JwtRegisteredClaimNames.Sub,
                usuario.Id.ToString()
            ),
            new Claim(
                JwtRegisteredClaimNames.Jti,
                Guid.NewGuid().ToString()
            ),
            new Claim(
                "security_stamp",
                await _userManager.GetSecurityStampAsync(usuario)
            )
        };

        var chave = new SymmetricSecurityKey(
            Convert.FromBase64String(_config["Jwt:Key"]!)
        );

        var credenciais = new SigningCredentials(
            chave, SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credenciais
        );

        return Ok(new
        {
            token = new JwtSecurityTokenHandler()
                .WriteToken(token)
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var id = User.FindFirst(
            JwtRegisteredClaimNames.Sub)?.Value;

        if (!Guid.TryParse(id, out var usuarioId))
            return Unauthorized();

        var usuario = await _userManager.FindByIdAsync(
            usuarioId.ToString()
        );

        if (usuario == null)
            return Unauthorized();

        return Ok(new
        {
            usuario.Id,
            usuario.Nome,
            usuario.Email,
            usuario.UserName
        });
    }
}
