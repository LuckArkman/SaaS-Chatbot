using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SaaS.OmniChannelPlatform.Services.Identity.Application.Services;
using SaaS.OmniChannelPlatform.Services.Identity.Domain.Entities;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Identity.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly ITokenService _tokenService;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            ITokenService tokenService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user != null && await _userManager.CheckPasswordAsync(user, model.Password))
            {
                var roles = await _userManager.GetRolesAsync(user);
                var token = _tokenService.GenerateToken(user, roles);
                return Ok(new { Token = token, FullName = user.FullName });
            }
            return Unauthorized();
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                TenantId = model.TenantId
            };

            var result = await _userManager.CreateAsync(user, model.Password);
            if (result.Succeeded)
            {
                if (!string.IsNullOrEmpty(model.Role))
                {
                    var roleExists = await _roleManager.RoleExistsAsync(model.Role);
                    if (!roleExists)
                    {
                        // Clean up user if role assignment fails to maintain consistency
                        await _userManager.DeleteAsync(user);
                        return BadRequest(new { Message = $"Role '{model.Role}' does not exist." });
                    }
                    await _userManager.AddToRoleAsync(user, model.Role);
                }
                return Ok(new { Message = "User created successfully" });
            }
            return BadRequest(result.Errors);
        }
    }

    public record LoginModel(string Email, string Password);
    public record RegisterModel(string Email, string Password, string FullName, Guid? TenantId, string Role);
}
