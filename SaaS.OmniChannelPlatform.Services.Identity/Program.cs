using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SaaS.OmniChannelPlatform.Services.Identity.Application.Services;
using SaaS.OmniChannelPlatform.Services.Identity.Domain.Entities;
using SaaS.OmniChannelPlatform.Services.Identity.Infrastructure.Persistence;
using SaaS.OmniChannelPlatform.Services.Identity.Infrastructure.Handlers;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// DbContext
builder.Services.AddDbContext<IdentityContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity
builder.Services.AddIdentity<ApplicationUser, ApplicationRole>(options => {
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
})
.AddEntityFrameworkStores<IdentityContext>()
.AddDefaultTokenProviders();

// Token Service
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.AddScoped<ITokenService>(sp => new TokenService(
    jwtSettings["Secret"]!,
    jwtSettings["Issuer"]!,
    jwtSettings["Audience"]!,
    int.Parse(jwtSettings["ExpiryInMinutes"] ?? "1440")
));

builder.Services.AddHttpContextAccessor();
builder.Services.AddTransient<HeaderForwardingHandler>();

// HttpClients for Backend Services
var serviceUrls = builder.Configuration.GetSection("ServiceUrls");
builder.Services.AddHttpClient("FlowEngine", c => c.BaseAddress = new Uri(serviceUrls["FlowEngine"]!)).AddHttpMessageHandler<HeaderForwardingHandler>();
builder.Services.AddHttpClient("Chat", c => c.BaseAddress = new Uri(serviceUrls["Chat"]!)).AddHttpMessageHandler<HeaderForwardingHandler>();
builder.Services.AddHttpClient("Messaging", c => c.BaseAddress = new Uri(serviceUrls["Messaging"]!)).AddHttpMessageHandler<HeaderForwardingHandler>();
builder.Services.AddHttpClient("Campaign", c => c.BaseAddress = new Uri(serviceUrls["Campaign"]!)).AddHttpMessageHandler<HeaderForwardingHandler>();
builder.Services.AddHttpClient("ChannelGateway", c => c.BaseAddress = new Uri(serviceUrls["ChannelGateway"]!)).AddHttpMessageHandler<HeaderForwardingHandler>();
builder.Services.AddHttpClient("Billing", c => c.BaseAddress = new Uri(serviceUrls["Billing"]!)).AddHttpMessageHandler<HeaderForwardingHandler>();

// JWT Authentication
builder.Services.AddAuthentication(options => {
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
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

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => {
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Identity Service", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme {
        In = ParameterLocation.Header,
        Description = "Please enter token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
        {
            new OpenApiSecurityScheme {
                Reference = new OpenApiReference {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed Admin
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<IdentityContext>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
    
    context.Database.EnsureCreated();
    
    var roles = new[] { "AdminMaster", "Reseller", "Client" };
    foreach (var role in roles)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new ApplicationRole { Name = role, NormalizedName = role.ToUpper() });
        }
    }
    
    if (await userManager.FindByEmailAsync("admin@saas.com") == null)
    {
        var admin = new ApplicationUser 
        { 
            UserName = "admin@saas.com", 
            Email = "admin@saas.com", 
            FullName = "Admin Master",
            IsActive = true
        };
        await userManager.CreateAsync(admin, "Admin123!");
        await userManager.AddToRoleAsync(admin, "AdminMaster");
    }
}

app.Run();
