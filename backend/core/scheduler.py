import asyncio
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from core.dependencies import get_db
from services.election_status import ElectionStatusService



class ElectionStatusScheduler:
    """Scheduler for automatically updating election statuses"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
    
    def start(self):
        """Start the scheduler"""
        if not self.is_running:
            # Update election statuses every minute
            self.scheduler.add_job(
                func=self._update_election_statuses,
                trigger=IntervalTrigger(minutes=1),
                id='update_election_statuses',
                name='Update Election Statuses',
                replace_existing=True
            )
            
            # Also run immediately on startup
            self.scheduler.add_job(
                func=self._update_election_statuses,
                trigger='date',
                id='initial_election_status_update',
                name='Initial Election Status Update',
                replace_existing=True
            )
            
            self.scheduler.start()
            self.is_running = True
            print("Election status scheduler started")
    
    def stop(self):
        """Stop the scheduler"""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            print("Election status scheduler stopped")
    
    async def _update_election_statuses(self):
        """Background task to update election statuses"""
        try:
            # Get a new database session for this background task
            async for db in get_db():
                try:
                    updated_count = await ElectionStatusService.update_election_statuses(db)
                    if updated_count > 0:
                        print(f"Background task updated {updated_count} election statuses")
                    break
                except Exception as e:
                    print(f"Error in background election status update: {str(e)}")
                    break
        except Exception as e:
            print(f"Error in background election status update: {str(e)}")
    
    async def sync_all_statuses(self):
        """Manually sync all election statuses (useful for fixing inconsistencies)"""
        try:
            async for db in get_db():
                try:
                    updated_count = await ElectionStatusService.sync_all_election_statuses(db)
                    print(f"Manual sync updated {updated_count} election statuses")
                    return updated_count
                except Exception as e:
                    print(f"Error in manual election status sync: {str(e)}")
                    raise
                finally:
                    break
        except Exception as e:
            print(f"Failed to get database session for manual sync: {str(e)}")
            raise


# Global scheduler instance
election_status_scheduler = ElectionStatusScheduler()


def start_election_status_scheduler():
    """Start the election status scheduler"""
    election_status_scheduler.start()


def stop_election_status_scheduler():
    """Stop the election status scheduler"""
    election_status_scheduler.stop()


async def sync_election_statuses():
    """Manually sync election statuses"""
    return await election_status_scheduler.sync_all_statuses()
