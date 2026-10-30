
using System.ComponentModel.DataAnnotations;

namespace MiniTwitter.Api.DTOs;

public class AtualizarPerfilDto
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [StringLength(30, MinimumLength = 3)]
    public string NomeUsuario { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;
}

public class AlterarSenhaDto
{
    [Required]
    public string SenhaAtual { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string NovaSenha { get; set; } = string.Empty;
}

public class ExcluirContaDto
{
    [Required]
    public string Senha { get; set; } = string.Empty;
}
