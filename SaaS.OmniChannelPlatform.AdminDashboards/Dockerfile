FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY ["SaaS-Chatbot.sln", "./"]
COPY ["SaaS.OmniChannelPlatform.AdminDashboards/SaaS.OmniChannelPlatform.AdminDashboards.csproj", "SaaS.OmniChannelPlatform.AdminDashboards/"]

RUN dotnet restore "SaaS.OmniChannelPlatform.AdminDashboards/SaaS.OmniChannelPlatform.AdminDashboards.csproj"

COPY . .
WORKDIR "/src/SaaS.OmniChannelPlatform.AdminDashboards"
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SaaS.OmniChannelPlatform.AdminDashboards.dll"]
