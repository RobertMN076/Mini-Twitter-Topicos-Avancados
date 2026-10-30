
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MiniTwitter.Api.Models;

namespace MiniTwitter.Api.Data;

public class AppDbContext
    : IdentityDbContext<Usuario, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Postagem> Postagens => Set<Postagem>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Postagem>()
            .HasOne(p => p.Autor)
            .WithMany(u => u.Postagens)
            .HasForeignKey(p => p.AutorId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
