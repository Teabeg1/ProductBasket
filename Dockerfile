# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore
COPY ["backend/ProductBasket.Api.csproj", "backend/"]
RUN dotnet restore "backend/ProductBasket.Api.csproj"

# Copy all backend source code
COPY backend/ backend/
WORKDIR /src/backend
RUN dotnet publish "ProductBasket.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ProductBasket.Api.dll"]
