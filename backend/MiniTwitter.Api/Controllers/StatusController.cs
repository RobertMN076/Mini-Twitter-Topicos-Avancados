
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniTwitter.Api.Data;

namespace MiniTwitter.Api.Controllers;

[ApiController]
[Route("api/status")]
public class StatusController : ControllerBase
{
    private readonly AppDbContext _context;

    public StatusController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetStatus()
    {
        bool conectado = await _context.Database.CanConnectAsync();

        if (!conectado)
        {
            return StatusCode(503, new
            {
                mensagem = "Falha na conexão com o banco."
            });
        }

        return Ok(new
        {
            mensagem = "API e SQL Server conectados!"
        });
    }
}
