FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["SaaS-Chatbot.sln", "./"]
COPY ["SaaS.OmniChannelPlatform.Services.Campaign/SaaS.OmniChannelPlatform.Services.Campaign.csproj", "SaaS.OmniChannelPlatform.Services.Campaign/"]
COPY ["SaaS.OmniChannelPlatform.BuildingBlocks/SaaS.OmniChannelPlatform.BuildingBlocks.csproj", "SaaS.OmniChannelPlatform.BuildingBlocks/"]

RUN dotnet restore "SaaS.OmniChannelPlatform.Services.Campaign/SaaS.OmniChannelPlatform.Services.Campaign.csproj"

COPY . .
WORKDIR "/src/SaaS.OmniChannelPlatform.Services.Campaign"
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SaaS.OmniChannelPlatform.Services.Campaign.dll"]
