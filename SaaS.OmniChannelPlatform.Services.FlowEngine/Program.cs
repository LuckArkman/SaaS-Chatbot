using MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SaaS.OmniChannelPlatform.Services.FlowEngine.Application.Consumers;
using SaaS.OmniChannelPlatform.Services.FlowEngine.Infrastructure.Persistence;
using SaaS.OmniChannelPlatform.Services.FlowEngine.Domain.Entities;
using SaaS.OmniChannelPlatform.BuildingBlocks.MultiTenancy;
using SaaS.OmniChannelPlatform.BuildingBlocks.Security;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// DbContext
builder.Services.AddDbContext<FlowDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// MassTransit + RabbitMQ
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<FlowMessageConsumer>();
    x.AddConsumer<AIResponseConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitConfig = builder.Configuration.GetSection("RabbitMQ");
        cfg.Host(rabbitConfig["Host"], "/", h =>
        {
            h.Username(rabbitConfig["UserName"]!);
            h.Password(rabbitConfig["Password"]!);
        });

        cfg.ReceiveEndpoint("flow-engine-messages", e =>
        {
            e.ConfigureConsumer<FlowMessageConsumer>(context);
        });

        cfg.ReceiveEndpoint("flow-engine-ai-responses", e =>
        {
            e.ConfigureConsumer<AIResponseConsumer>(context);
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
builder.Services.AddScoped<ISubscriptionService, AlwaysActiveSubscriptionService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => {
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Flow Engine Service", Version = "v1" });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<TenantResolverMiddleware>();
app.UseAuthentication();
app.UseMiddleware<SubscriptionCheckMiddleware>();
app.UseAuthorization();

app.MapControllers();

// Seed Default Flow
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<FlowDbContext>();
    context.Database.EnsureCreated();

    if (!context.Flows.Any())
    {
        var tenantId = Guid.Parse("88888888-4444-4444-4444-121212121212"); // Mock Tenant
        var flow = new FlowDefinition
        {
            TenantId = tenantId,
            Name = "Default Greeting",
            IsActive = true
        };

        flow.Steps.Add(new FlowStep { FlowDefinitionId = flow.Id, Order = 1, Content = "Olá! Bem-vindo ao atendimento inteligente. Como posso ajudar?", Type = "Message" });
        flow.Steps.Add(new FlowStep { FlowDefinitionId = flow.Id, Order = 2, Content = "Você é um assistente virtual prestativo da plataforma OmniChannel.", Type = "Ai" });
        flow.Steps.Add(new FlowStep { FlowDefinitionId = flow.Id, Order = 3, Content = "Transferindo para um humano para suporte avançado...", Type = "Handover" });

        context.Flows.Add(flow);
        context.SaveChanges();
    }
}

app.Run();
