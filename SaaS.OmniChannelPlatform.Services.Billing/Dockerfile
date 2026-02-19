FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY ["SaaS-Chatbot.sln", "./"]
COPY ["SaaS.OmniChannelPlatform.Services.Billing/SaaS.OmniChannelPlatform.Services.Billing.csproj", "SaaS.OmniChannelPlatform.Services.Billing/"]
COPY ["SaaS.OmniChannelPlatform.BuildingBlocks/SaaS.OmniChannelPlatform.BuildingBlocks.csproj", "SaaS.OmniChannelPlatform.BuildingBlocks/"]

RUN dotnet restore "SaaS.OmniChannelPlatform.Services.Billing/SaaS.OmniChannelPlatform.Services.Billing.csproj"

COPY . .
WORKDIR "/src/SaaS.OmniChannelPlatform.Services.Billing"
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SaaS.OmniChannelPlatform.Services.Billing.dll"]
