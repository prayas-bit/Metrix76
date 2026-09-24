import hashlib
import json
import qrcode
import io
import base64
from typing import Dict, Any

class CryptoAuditService:
    @staticmethod
    def generate_sha256_hash(data: Dict[str, Any]) -> str:
        """
        Creates a deterministic SHA-256 cryptographic digest of test report observation records.
        """
        serialized = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode('utf-8')).hexdigest()

    @staticmethod
    def generate_qr_code_base64(verification_url: str) -> str:
        """
        Generates a high-contrast QR code as a base64 string for PDF/DOCX embedding.
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=6,
            border=2,
        )
        qr.add_data(verification_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffered = io.BytesIO()
        img.save(buffered)
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
