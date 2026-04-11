# ✅ AEGIS-FIN Deployment Checklist

## Pre-Deployment

### Supabase Setup
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Run database schema (`backend/schema.sql`)
- [ ] Configure Row Level Security (RLS) policies
- [ ] Note down Project URL and API keys
- [ ] Test connection from local machine

### Backend Setup
- [ ] Install Python dependencies: `pip install -r backend/requirements.txt`
- [ ] Create `backend/.env` from `.env.example`
- [ ] Add Supabase SERVICE_KEY to `backend/.env`
- [ ] Test backend connection: `python backend/test_connection.py`
- [ ] Run initial pipeline: `python backend/daily_pipeline.py`
- [ ] Verify data in Supabase dashboard

### Frontend Setup
- [ ] Install Node dependencies: `cd frontend && npm install`
- [ ] Create `frontend/.env` from `.env.example`
- [ ] Add Supabase ANON_KEY to `frontend/.env`
- [ ] Test locally: `npm run dev`
- [ ] Verify data loads correctly

---

## Vercel Deployment

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 3. Add Environment Variables in Vercel
Go to: Dashboard → Your Project → Settings → Environment Variables

Add:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Redeploy
- Vercel will automatically redeploy with new environment variables
- Or manually trigger: Deployments → ... → Redeploy

### 5. Verify Deployment
- [ ] Site loads: `https://your-app.vercel.app`
- [ ] No console errors (F12 → Console)
- [ ] Data loads correctly
- [ ] Live market bar updates
- [ ] All pages work

---

## Backend Automation

### Windows

```bash
# Run as Administrator
cd backend
setup_daily_task.bat
```

Verify:
- [ ] Task created in Task Scheduler (`taskschd.msc`)
- [ ] Next run time is correct (6:30 PM IST)
- [ ] Test run: Right-click task → Run

### Linux/Mac

```bash
# Edit crontab
crontab -e

# Add this line (1:00 PM UTC = 6:30 PM IST)
0 13 * * 1-5 /path/to/venv/bin/python /path/to/backend/daily_pipeline.py
```

Verify:
- [ ] Cron job listed: `crontab -l`
- [ ] Test run: `/path/to/venv/bin/python /path/to/backend/daily_pipeline.py`
- [ ] Check logs: `tail -f backend/pipeline_run.log`

---

## Post-Deployment

### Immediate Checks (First Hour)
- [ ] Frontend loads without errors
- [ ] All pages accessible
- [ ] Data displays correctly
- [ ] Live market data updates
- [ ] No console errors
- [ ] Mobile responsive

### First Day
- [ ] Pipeline runs successfully at scheduled time
- [ ] Check logs: `backend/pipeline_run.log`
- [ ] Verify new data in Supabase
- [ ] Frontend shows updated data
- [ ] No errors in Vercel logs

### First Week
- [ ] Daily pipeline runs successfully
- [ ] Data quality is good
- [ ] No performance issues
- [ ] Storage usage acceptable
- [ ] User feedback positive

---

## Monitoring Setup

### Vercel
- [ ] Enable Analytics (Dashboard → Analytics)
- [ ] Set up deployment notifications
- [ ] Configure custom domain (optional)
- [ ] Enable Speed Insights

### Supabase
- [ ] Monitor storage usage (Dashboard → Settings → Usage)
- [ ] Check API request count
- [ ] Review slow queries
- [ ] Set up email alerts

### Backend
- [ ] Set up log rotation
- [ ] Monitor disk space
- [ ] Check pipeline success rate
- [ ] Review error patterns

---

## Security Checklist

### Supabase
- [ ] RLS enabled on all tables
- [ ] Anon key used in frontend (not service key)
- [ ] Service key used in backend (not anon key)
- [ ] 2FA enabled on Supabase account
- [ ] API keys not committed to Git

### Vercel
- [ ] Environment variables set correctly
- [ ] HTTPS enabled (automatic)
- [ ] Custom domain configured (if applicable)
- [ ] Deploy hooks secured

### Backend
- [ ] `.env` file in `.gitignore`
- [ ] Service key kept secret
- [ ] Server/machine secured
- [ ] Logs don't contain sensitive data

---

## Performance Optimization

### Frontend
- [ ] Images optimized
- [ ] Code splitting enabled
- [ ] Lazy loading implemented
- [ ] Bundle size acceptable
- [ ] Lighthouse score > 90

### Backend
- [ ] Pipeline completes in < 60 minutes
- [ ] No memory leaks
- [ ] Efficient database queries
- [ ] Proper error handling
- [ ] Logs rotated regularly

### Database
- [ ] Indexes on frequently queried columns
- [ ] Old data cleaned up (6-month retention)
- [ ] Query performance acceptable
- [ ] No slow queries

---

## Backup Strategy

### Database
- [ ] Supabase automatic backups enabled (Pro plan)
- [ ] Manual backup script created
- [ ] Backup schedule documented
- [ ] Restore procedure tested

### Code
- [ ] Git repository backed up
- [ ] Environment variables documented
- [ ] Configuration files saved
- [ ] Deployment process documented

---

## Documentation

### For Users
- [ ] User guide created
- [ ] FAQ documented
- [ ] Support contact provided
- [ ] Feature documentation complete

### For Developers
- [ ] README updated
- [ ] API documentation complete
- [ ] Deployment guide written
- [ ] Troubleshooting guide created

---

## Rollback Plan

### If Deployment Fails

1. **Revert Vercel Deployment**
   - Dashboard → Deployments → Previous deployment → Promote to Production

2. **Check Logs**
   - Vercel: Dashboard → Deployments → View Logs
   - Backend: `tail -f backend/pipeline_run.log`
   - Supabase: Dashboard → Logs

3. **Fix Issues**
   - Review error messages
   - Fix code/configuration
   - Test locally
   - Redeploy

4. **Verify Fix**
   - Test all functionality
   - Check logs for errors
   - Monitor for 24 hours

---

## Success Criteria

### Technical
- ✅ Frontend deployed and accessible
- ✅ Backend pipeline running daily
- ✅ Data updating correctly
- ✅ No critical errors
- ✅ Performance acceptable

### Business
- ✅ Users can access all features
- ✅ Data is fresh and accurate
- ✅ System is reliable
- ✅ Costs within budget
- ✅ Scalable for growth

---

## Next Steps After Deployment

### Week 1
1. Monitor daily pipeline runs
2. Check for any errors
3. Gather user feedback
4. Fix any issues

### Month 1
1. Review performance metrics
2. Optimize slow queries
3. Update documentation
4. Plan new features

### Ongoing
1. Monthly dependency updates
2. Quarterly security review
3. Regular backups
4. Performance monitoring

---

## Emergency Contacts

- **Vercel Support:** [vercel.com/support](https://vercel.com/support)
- **Supabase Support:** [supabase.com/support](https://supabase.com/support)
- **Your Team:** [Add contact info]

---

## Final Checklist

Before going live:
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Backups enabled
- [ ] Security reviewed
- [ ] Performance acceptable
- [ ] Team trained
- [ ] Users notified

🚀 **Ready to deploy!**
