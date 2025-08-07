# from datetime import datetime
#
# from sqlalchemy.ext.asyncio import AsyncSession
#
# from models import Payment
# from schemas.register import PaymentInfo
#
#
# class PaymentService:
#     def __init__(self, db: AsyncSession):
#         self.db = db
#
#     def process_payment(self, org_id: int, payment_data: PaymentInfo) -> Payment:
#         payment = Payment(
#             organization_id=org_id,
#             amount=99.00,
#             currency="USD",
#             status="completed",
#             payment_date=datetime.now(),
#             last_four=payment_data.card_number[-4:],
#         )
#         self.db.add(payment)
#
#         org.status = "payment_completed"
#         self.db.commit()
#         return payment
