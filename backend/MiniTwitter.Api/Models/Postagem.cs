
using System.ComponentModel.DataAnnotations;

namespace MiniTwitter.Api.Models;

public class Postagem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(280)]
    public string Texto { get; set; } = string.Empty;

    public byte[]? ImagemDados { get; set; }

    [MaxLength(100)]
    public string? ImagemTipo { get; set; }

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public Guid AutorId { get; set; }

    public Usuario Autor { get; set; } = null!;
}
