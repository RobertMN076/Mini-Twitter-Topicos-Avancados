
using System.ComponentModel.DataAnnotations;

namespace MiniTwitter.Api.DTOs;

public class PostagemFormDto
{
    [MaxLength(280)]
    public string Texto { get; set; } = string.Empty;

    public IFormFile? Imagem { get; set; }

    public bool RemoverImagem { get; set; }
}
