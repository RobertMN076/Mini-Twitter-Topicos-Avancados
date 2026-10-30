
using System.ComponentModel.DataAnnotations;

namespace MiniTwitter.Api.DTOs;

public class SalvarPostagemDto
{
    [Required(ErrorMessage = "O texto é obrigatório.")]
    [StringLength(
        280,
        MinimumLength = 1,
        ErrorMessage = "A postagem deve ter até 280 caracteres."
    )]
    public string Texto { get; set; } = string.Empty;
}
