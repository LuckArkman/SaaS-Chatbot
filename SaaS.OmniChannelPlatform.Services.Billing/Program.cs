using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SaaS.OmniChannelPlatform.Services.Billing.Infrastructure.Persistence;
using SaaS.OmniChannelPlatform.Services.Billing.Domain.Entities;
using System.Text;
using MassTransit;
using SaaS.OmniChannelPlatform.BuildingBlocks.MultiTenancy;
using SaaS.OmniChannelPlatform.BuildingBlocks.Security;
using SaaS.OmniChannelPlatform.Services.Billing.Application.Services;

var builder = WebApplication.CreateBuilder(args);

// DbContext
builder.Services.AddDbContext<BillingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// MassTransit + RabbitMQ
builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitConfig = builder.Configuration.GetSection("RabbitMQ");
        cfg.Host(rabbitConfig["Host"], "/", h =>
        {
            h.Username(rabbitConfig["UserName"]!);
            h.Password(rabbitConfig["Password"]!);
        });
    });
});

// Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options => {
    options.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Secret"]!))
    };
});

// Multi-Tenancy & Security
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<ISubscriptionService, BillingSubscriptionService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => {
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Billing Service", Version = "v1" });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseMiddleware<TenantResolverMiddleware>();
app.UseAuthentication();
app.UseMiddleware<SubscriptionCheckMiddleware>();
app.UseAuthorization();

app.MapControllers();

// Seed Plans
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BillingDbContext>();
    context.Database.EnsureCreated();

    if (!context.Plans.Any())
    {
        context.Plans.AddRange(
            new Plan { Name = "Lite", Price = 99.90m, MessageLimit = 1000, ActiveChatsLimit = 5 },
            new Plan { Name = "Pro", Price = 249.90m, MessageLimit = 5000, ActiveChatsLimit = 20 },
            new Plan { Name = "Enterprise", Price = 599.90m, MessageLimit = 100000, ActiveChatsLimit = 1000 }
        );
        context.SaveChanges();
    }
}

app.Run();
