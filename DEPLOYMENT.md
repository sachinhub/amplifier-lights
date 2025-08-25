# Amplifier Lights - Render Deployment Guide

## Prerequisites
- [Render account](https://render.com)
- [GitHub repository](https://github.com) with your code
- PostgreSQL database (Render will create this)

## Deployment Steps

### 1. Connect Your Repository
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository: `amplifier-lights`

### 2. Configure the Web Service
- **Name**: `amplifier-lights-api`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run migrate && npm start`
- **Plan**: `Starter` (or choose based on your needs)

### 3. Environment Variables
Render will automatically set these from the `render.yaml`:
- `NODE_ENV`: production
- `PORT`: 10000
- `DATABASE_URL`: Auto-generated from PostgreSQL service
- `REDIS_URL`: Auto-generated from Redis service
- `CORS_ORIGIN`: *
- `LOG_LEVEL`: info
- Rate limiting configurations

### 4. Create Database
1. In Render Dashboard, click "New +" → "PostgreSQL"
2. Name: `amplifier-lights-db`
3. Database: `amplifier_light`
4. User: `amplifier_light_user`
5. Plan: `Starter`

### 5. Create Redis
1. In Render Dashboard, click "New +" → "Redis"
2. Name: `amplifier-lights-redis`
3. Plan: `Starter`

### 6. Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy your application
3. **Build Process**: 
   - Installs all dependencies (including build tools)
   - Creates the application container
   - Runs database migrations on startup
4. Monitor the build logs for any issues

## Manual Deployment (Alternative)

If you prefer manual setup:

```bash
# Clone your repository
git clone <your-repo-url>
cd amplifier-lights

# Install dependencies
npm install

# Set environment variables
export NODE_ENV=production
export PORT=10000
export DATABASE_URL=<your-render-postgres-url>
export REDIS_URL=<your-render-redis-url>

# Run migrations and start the application
npm run migrate && npm start
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | production |
| `PORT` | Server port | 10000 |
| `DATABASE_URL` | PostgreSQL connection string | Auto-generated |
| `REDIS_URL` | Redis connection string | Auto-generated |
| `CORS_ORIGIN` | CORS allowed origins | * |
| `LOG_LEVEL` | Logging level | info |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 60000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## Health Check

Your application includes a health check endpoint at `/health` that returns:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

## Monitoring

- **Logs**: View in Render Dashboard → Your Service → Logs
- **Metrics**: Monitor CPU, memory, and response times
- **Health Checks**: Automatic health monitoring every 30 seconds

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check `package.json` for correct scripts
   - Verify Node.js version compatibility
   - Check build logs for dependency issues

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is set correctly
   - Check if database service is running
   - Ensure migrations complete successfully

3. **Redis Connection Issues**
   - Verify `REDIS_URL` is set correctly
   - Check if Redis service is running

4. **Port Issues**
   - Ensure `PORT` environment variable is set
   - Render automatically assigns ports

### Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- Check your service logs for detailed error information

## Post-Deployment

1. **Test Your API Endpoints**
   ```bash
   curl https://your-app-name.onrender.com/health
   curl https://your-app-name.onrender.com/api/v1
   ```

2. **Monitor Performance**
   - Check response times
   - Monitor database performance
   - Watch Redis usage

3. **Set Up Custom Domain** (Optional)
   - Go to your service settings
   - Add custom domain
   - Configure DNS records

## Security Notes

- All environment variables are encrypted at rest
- Database connections use SSL by default
- Rate limiting is enabled for API protection
- CORS is configured for production use
