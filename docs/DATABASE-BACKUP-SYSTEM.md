# Database Backup System

This system provides automated biweekly backups and manual backup capabilities for the CMDA MongoDB database.

## Features

- **Manual Backups**: Create on-demand database backups via admin panel
- **Scheduled Backups**: Automatic backups every 2 weeks (Sunday at 2 AM)
- **Backup Management**: View, list, and delete backups
- **Auto-cleanup**: Keeps only the last 10 backups
- **SuperAdmin Only**: Restricted to SuperAdmin role for security

## Prerequisites

### MongoDB Tools Installation

The backup system uses `mongodump` which is part of MongoDB Database Tools. You need to install it on your server:

#### For Windows (Development)
```bash
# Download MongoDB Database Tools from:
https://www.mongodb.com/try/download/database-tools

# Or use Chocolatey:
choco install mongodb-database-tools
```

#### For Linux (Production - Ubuntu/Debian)
```bash
# Import the public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB Database Tools
sudo apt-get update
sudo apt-get install -y mongodb-database-tools
```

#### For Linux (Production - CentOS/RHEL)
```bash
sudo yum install mongodb-database-tools
```

#### Verify Installation
```bash
mongodump --version
```

## Configuration

The backup system is configured via environment variables in `.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
```

## Usage

### Admin Panel

1. Navigate to **Settings > System Backup** in the admin dashboard
2. Only SuperAdmin users can access this page
3. Click **Create Backup** to create a manual backup
4. View all backups in the table with creation date and size
5. Delete old backups if needed

### API Endpoints

All endpoints require SuperAdmin authentication:

#### Create Backup
```http
POST /backup/create
Authorization: Bearer {token}
```

#### List Backups
```http
GET /backup/list
Authorization: Bearer {token}
```

#### Delete Backup
```http
DELETE /backup/:filename
Authorization: Bearer {token}
```

## Backup Schedule

- **Frequency**: Every 2 weeks (biweekly)
- **Day**: Sunday
- **Time**: 2:00 AM server time
- **Retention**: Last 10 backups kept automatically

## Backup Storage

Backups are stored in the `backups/` directory at the root of the backend application:

```
CMDA-Backend/
  backups/
    cmda-backup-2025-12-16T10-30-00-000Z/
    cmda-backup-2025-12-02T02-00-00-000Z/
    ...
```

### Backup Structure

Each backup is stored in its own directory containing:
- `database_name/` - Collections and documents
- BSON files for each collection
- Metadata files

## Production Deployment Considerations

### 1. Disk Space

Ensure adequate disk space for backups:
```bash
# Check available disk space
df -h

# Monitor backup directory size
du -sh /path/to/CMDA-Backend/backups
```

### 2. Permissions

Ensure the application has write permissions:
```bash
chmod 755 /path/to/CMDA-Backend/backups
chown nodeuser:nodeuser /path/to/CMDA-Backend/backups
```

### 3. Remote Storage (Recommended)

For production, consider uploading backups to remote storage:

#### AWS S3 Integration (Future Enhancement)
```bash
# Install AWS CLI
npm install @aws-sdk/client-s3

# Upload backups to S3 after creation
aws s3 sync ./backups s3://your-bucket/cmda-backups/
```

#### Google Cloud Storage (Future Enhancement)
```bash
# Install Google Cloud SDK
npm install @google-cloud/storage

# Upload to GCS
gsutil -m rsync -r ./backups gs://your-bucket/cmda-backups/
```

### 4. Monitoring

Monitor backup logs in production:
```bash
# View application logs
pm2 logs cmda-backend

# Filter backup-related logs
pm2 logs cmda-backend | grep "Backup"
```

### 5. Backup Verification

Periodically verify backups can be restored:
```bash
# Test restore (to a test database)
mongorestore --uri="mongodb://localhost:27017/test_db" ./backups/cmda-backup-2025-12-16T10-30-00-000Z/
```

## Restore Process

To restore from a backup:

```bash
# Navigate to backup directory
cd CMDA-Backend/backups

# Restore specific backup
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/database_name" ./cmda-backup-2025-12-16T10-30-00-000Z/
```

⚠️ **Warning**: Restoring will overwrite the current database. Always backup current data first!

## Troubleshooting

### Backup Fails

1. **Check mongodump installation**:
   ```bash
   which mongodump
   mongodump --version
   ```

2. **Check MongoDB connection**:
   ```bash
   mongosh "mongodb+srv://cluster.mongodb.net" --username user
   ```

3. **Check disk space**:
   ```bash
   df -h
   ```

4. **Check permissions**:
   ```bash
   ls -la backups/
   ```

### Scheduled Backup Not Running

1. **Verify NestJS Schedule Module**:
   Check that `ScheduleModule.forRoot()` is imported in `app.module.ts`

2. **Check Server Time**:
   ```bash
   date
   timedatectl  # Linux
   ```

3. **Check Application Logs**:
   ```bash
   pm2 logs cmda-backend
   ```

## Security Considerations

1. **Access Control**: Only SuperAdmin can create/delete backups
2. **Sensitive Data**: Backups contain sensitive data - secure storage location
3. **Encryption**: Consider encrypting backups at rest in production
4. **Network Transfer**: Use encrypted connections (SSL/TLS) for MongoDB
5. **Audit Logs**: Monitor who creates/deletes backups

## Future Enhancements

- [ ] Upload backups to S3/GCS/Azure Blob Storage
- [ ] Email notifications on backup completion/failure
- [ ] Backup encryption
- [ ] Incremental backups for large databases
- [ ] Backup download via admin panel
- [ ] Automated restore testing
- [ ] Backup compression to save disk space
- [ ] Multi-region backup replication

## Support

For issues or questions about the backup system, contact the development team or check the application logs.
