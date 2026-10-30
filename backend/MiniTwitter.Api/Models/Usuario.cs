
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace MiniTwitter.Api.Models;

public class Usuario : IdentityUser<Guid>
{
    [Required]
    [MaxLength(100)]
    public string Nome { get; set; } = string.Empty;

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public ICollection<Postagem> Postagens { get; set; }
        = new List<Postagem>();
}
