using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ProductBasket.Api.Models;

namespace ProductBasket.Api.Services;

public interface ITokenService
{
    string GenerateToken(User user, Guid? familyId = null);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user, Guid? familyId = null)
    {
        var secretKey = _configuration["Jwt:SecretKey"] ?? "ProductBasket_SuperSecretKey_For_Development_Only_2026!#";
        var issuer = _configuration["Jwt:Issuer"] ?? "ProductBasketApi";
        var audience = _configuration["Jwt:Audience"] ?? "ProductBasketClient";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.DisplayName)
        };

        if (familyId.HasValue)
        {
            claims.Add(new Claim("FamilyId", familyId.Value.ToString()));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(30),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
