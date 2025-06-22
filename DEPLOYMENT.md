# Production Deployment Checklist

## Security
- [ ] Change JWT_SECRET to a secure random string (64+ characters)
- [ ] Change default MySQL password
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure firewall rules

## Database
- [ ] Backup existing data
- [ ] Use a dedicated MySQL user (not root)
- [ ] Configure MySQL for production
- [ ] Set up automated backups

## Application
- [ ] Configure email settings in admin panel
- [ ] Set up proper logging
- [ ] Configure file upload limits
- [ ] Test all functionality
- [ ] Set up monitoring

## Environment Variables (Production)
```env
NODE_ENV=production
DB_HOST=your_production_db_host
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
JWT_SECRET=your_64_character_secure_secret
```

## File Permissions
- uploads/ directory: writable by application
- .env file: readable by application only (chmod 600)

## Dependencies
- Ensure all production dependencies are installed
- Run `npm run build` to test production build
- Configure reverse proxy (nginx/Apache) if needed
