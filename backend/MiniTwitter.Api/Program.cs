
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MiniTwitter.Api.Data;
using MiniTwitter.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// Banco de dados SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

// ASP.NET Identity
builder.Services.AddIdentityCore<Usuario>(options =>
{
    options.User.RequireUniqueEmail = true;

    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;

    options.Lockout.DefaultLockoutTimeSpan =
        TimeSpan.FromMinutes(5);

    options.Lockout.MaxFailedAccessAttempts = 5;
})
.AddRoles<IdentityRole<Guid>>()
.AddEntityFrameworkStores<AppDbContext>()
.AddSignInManager();

// Configuração JWT
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "Configure Jwt:Key nos User Secrets."
    );

var signingKey = new SymmetricSecurityKey(
    Convert.FromBase64String(jwtKey)
);

// Autenticação JWT Bearer
builder.Services.AddAuthentication(
    JwtBearerDefaults.AuthenticationScheme
)
.AddJwtBearer(options =>
{
    options.MapInboundClaims = false;

    // Validação do token
    options.TokenValidationParameters =
        new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],

            IssuerSigningKey = signingKey,

            ClockSkew = TimeSpan.Zero
        };

    // Verificar se o usuário ainda existe
    // e se o token continua válido
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var id = context.Principal?
                .FindFirst("sub")?.Value;

            var stamp = context.Principal?
                .FindFirst("security_stamp")?.Value;

            // Verifica se o token contém os dados necessários
            if (!Guid.TryParse(id, out var usuarioId) ||
                string.IsNullOrEmpty(stamp))
            {
                context.Fail("Token inválido.");
                return;
            }

            // Obtém o serviço de gerenciamento de usuários
            var userManager = context.HttpContext
                .RequestServices
                .GetRequiredService<UserManager<Usuario>>();

            // Procura o usuário no banco de dados
            var usuario = await userManager.FindByIdAsync(
                usuarioId.ToString()
            );

            // Verifica se o usuário existe e se o
            // SecurityStamp corresponde ao token
            if (usuario == null ||
                stamp != await userManager.GetSecurityStampAsync(usuario))
            {
                context.Fail("Sessão inválida.");
            }
        }
    };
});

// Autorização
builder.Services.AddAuthorization();

// CORS - Permite comunicação com o Next.js
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Construção da aplicação
var app = builder.Build();

// Middlewares
app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

// Rotas da API
app.MapControllers();

// Iniciar aplicação
app.Run();
