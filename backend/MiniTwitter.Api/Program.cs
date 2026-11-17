
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MiniTwitter.Api.Data;
using MiniTwitter.Api.Models;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);


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


var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "Configure Jwt:Key nos User Secrets."
    );

var signingKey = new SymmetricSecurityKey(
    Convert.FromBase64String(jwtKey)
);


builder.Services.AddAuthentication(
    JwtBearerDefaults.AuthenticationScheme
)
.AddJwtBearer(options =>
{
    options.MapInboundClaims = false;


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


    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var id = context.Principal?
                .FindFirst("sub")?.Value;

            var stamp = context.Principal?
                .FindFirst("security_stamp")?.Value;


            if (!Guid.TryParse(id, out var usuarioId) ||
                string.IsNullOrEmpty(stamp))
            {
                context.Fail("Token inválido.");
                return;
            }


            var userManager = context.HttpContext
                .RequestServices
                .GetRequiredService<UserManager<Usuario>>();


            var usuario = await userManager.FindByIdAsync(
                usuarioId.ToString()
            );


            if (usuario == null ||
                stamp != await userManager.GetSecurityStampAsync(usuario))
            {
                context.Fail("Sessão inválida.");
            }
        }
    };
});


builder.Services.AddAuthorization();


builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});


var app = builder.Build();


app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();


app.MapControllers();


app.Run();
