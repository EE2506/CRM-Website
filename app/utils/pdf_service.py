import os
from flask import render_template, current_app
from weasyprint import HTML
import tempfile

class PDFService:
    @staticmethod
    def generate_pdf(template_name, **kwargs):
        """
        Generates a PDF from a Jinja2 template.
        """
        try:
            html_content = render_template(template_name, **kwargs)
            
            # Create a temporary file to store the PDF
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                HTML(string=html_content).write_pdf(tmp.name)
                tmp_path = tmp.name
                
            with open(tmp_path, 'rb') as f:
                pdf_data = f.read()
                
            # Clean up temp file
            os.unlink(tmp_path)
            
            return pdf_data
        except Exception as e:
            current_app.logger.error(f"PDF Generation Error: {str(e)}")
            return None

    @staticmethod
    def generate_invoice_pdf(invoice_data):
        """
        Specific helper for invoices.
        """
        return PDFService.generate_pdf('pdf/invoice.html', invoice=invoice_data)

    @staticmethod
    def generate_sales_report_pdf(report_data):
        """
        Specific helper for sales reports.
        """
        return PDFService.generate_pdf('pdf/sales_report.html', report=report_data)
