FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy all project files to restore dependencies
COPY ["SaaS-Chatbot.sln", "./"]
COPY ["SaaS.OmniChannelPlatform.Services.Identity/SaaS.OmniChannelPlatform.Services.Identity.csproj", "SaaS.OmniChannelPlatform.Services.Identity/"]
COPY ["SaaS.OmniChannelPlatform.BuildingBlocks/SaaS.OmniChannelPlatform.BuildingBlocks.csproj", "SaaS.OmniChannelPlatform.BuildingBlocks/"]

RUN dotnet restore "SaaS.OmniChannelPlatform.Services.Identity/SaaS.OmniChannelPlatform.Services.Identity.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/SaaS.OmniChannelPlatform.Services.Identity"
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SaaS.OmniChannelPlatform.Services.Identity.dll"]
