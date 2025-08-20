from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from models.election import Election



class ElectionStatusService:
    """Service for automatically updating election statuses"""
    
    @staticmethod
    async def update_election_statuses(db):
        """
        Update election statuses based on current time and start/end dates.
        This should be called periodically (e.g., every minute) to keep statuses current.
        """
        try:
            now = datetime.now(timezone.utc)
            
            # Get all elections that need status updates
            elections_result = await db.execute(
                select(Election).where(
                    or_(
                        Election.status == "upcoming",
                        Election.status == "running"
                    )
                )
            )
            elections = elections_result.scalars().all()
            
            updated_count = 0
            
            for election in elections:
                status_changed = False
                new_status = election.status
                
                # Check if election should start
                if election.status == "upcoming" and now >= election.starts_at:
                    new_status = "running"
                    status_changed = True
                    print(f"Election {election.id} ({election.title}) has started")
                
                # Check if election should end
                elif election.status == "running" and now > election.ends_at:
                    new_status = "finished"
                    status_changed = True
                    print(f"Election {election.id} ({election.title}) has finished")
                    
                    # Note: Results finalization will be done manually or via API call
                    # to avoid async context issues in background scheduler
                    print(f"Election {election.id} status updated to finished")
                
                # Update status if it changed
                if status_changed:
                    election.status = new_status
                    updated_count += 1
            
            # Commit all changes
            if updated_count > 0:
                await db.commit()
                print(f"Updated {updated_count} election statuses")
            
            return updated_count
            
        except Exception as e:
            print(f"Error updating election statuses: {str(e)}")
            await db.rollback()
            raise
    
    @staticmethod
    async def get_election_computed_status(election: Election) -> str:
        """
        Get the computed status of an election based on current time.
        This doesn't update the database, just returns what the status should be.
        """
        now = datetime.now(timezone.utc)
        
        if now < election.starts_at:
            return "upcoming"
        elif now >= election.starts_at and now <= election.ends_at:
            return "running"
        else:
            return "finished"
    
    @staticmethod
    async def sync_all_election_statuses(db):
        """
        Force sync all election statuses to match their computed status.
        This is useful for fixing any inconsistencies.
        """
        try:
            now = datetime.now(timezone.utc)
            
            # Get all elections
            elections_result = await db.execute(select(Election))
            elections = elections_result.scalars().all()
            
            updated_count = 0
            
            for election in elections:
                computed_status = await ElectionStatusService.get_election_computed_status(election)
                
                if election.status != computed_status:
                    old_status = election.status
                    election.status = computed_status
                    updated_count += 1
                    print(f"Election {election.id} status updated: {old_status} -> {computed_status}")
            
            # Commit all changes
            if updated_count > 0:
                await db.commit()
                print(f"Synced {updated_count} election statuses")
            
            return updated_count
            
        except Exception as e:
            print(f"Error syncing election statuses: {str(e)}")
            await db.rollback()
            raise
