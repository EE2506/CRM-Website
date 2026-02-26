from flask import Blueprint, jsonify, request, g
from app.models import db, Ticket, TicketReply
from app.utils.security import require_permission
import datetime

tickets_bp = Blueprint('tickets', __name__)

@tickets_bp.route('', methods=['GET'])
@require_permission('tickets.view')
def get_tickets():
    status = request.args.get('status')
    priority = request.args.get('priority')
    
    query = Ticket.query.filter_by(company_id=g.current_user.company_id)
    
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
        
    tickets = query.order_by(Ticket.created_at.desc()).all()
    
    return jsonify({
        "success": True,
        "data": [{
            "id": t.id,
            "ticket_code": t.ticket_code,
            "subject": t.subject,
            "status": t.status,
            "priority": t.priority,
            "type": t.type,
            "assignee_id": t.assignee_id,
            "created_at": t.created_at.isoformat()
        } for t in tickets]
    }), 200

@tickets_bp.route('', methods=['POST'])
@require_permission('tickets.create')
def create_ticket():
    data = request.get_json()
    
    if not data or not data.get('subject'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Missing subject"}}), 400
        
    ticket = Ticket(
        ticket_code=Ticket.generate_ticket_code(),
        subject=data['subject'],
        description=data.get('description'),
        type=data.get('type', 'customer'),
        priority=data.get('priority', 'medium'),
        company_id=g.current_user.company_id,
        reporter_id=g.current_user.id,
        contact_id=data.get('contact_id')
    )
    
    db.session.add(ticket)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Ticket created successfully",
        "data": {"id": ticket.id, "ticket_code": ticket.ticket_code}
    }), 201

@tickets_bp.route('/<int:id>', methods=['GET'])
@require_permission('tickets.view')
def get_ticket_detail(id):
    ticket = Ticket.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    
    replies = TicketReply.query.filter_by(ticket_id=id).order_by(TicketReply.created_at.asc()).all()
    
    return jsonify({
        "success": True,
        "data": {
            "id": ticket.id,
            "ticket_code": ticket.ticket_code,
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "type": ticket.type,
            "assignee_id": ticket.assignee_id,
            "created_at": ticket.created_at.isoformat(),
            "replies": [{
                "id": r.id,
                "content": r.content,
                "is_internal": r.is_internal,
                "user_id": r.user_id,
                "created_at": r.created_at.isoformat()
            } for r in replies]
        }
    }), 200

@tickets_bp.route('/<int:id>/replies', methods=['POST'])
@require_permission('tickets.reply')
def add_reply(id):
    ticket = Ticket.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    data = request.get_json()
    
    if not data or not data.get('content'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Missing content"}}), 400
        
    reply = TicketReply(
        content=data['content'],
        is_internal=data.get('is_internal', False),
        ticket_id=id,
        user_id=g.current_user.id
    )
    
    # Update ticket status if provided
    if data.get('status'):
        ticket.status = data['status']
        if ticket.status == 'resolved':
            ticket.resolved_at = datetime.datetime.utcnow()
            
    db.session.add(reply)
    db.session.commit()
    
    return jsonify({"success": True, "message": "Reply added successfully"}), 201

@tickets_bp.route('/<int:id>/assign', methods=['POST'])
@require_permission('tickets.assign')
def assign_ticket(id):
    ticket = Ticket.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    data = request.get_json()
    
    if not data or not data.get('assignee_id'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Missing assignee_id"}}), 400
        
    ticket.assignee_id = data['assignee_id']
    ticket.status = 'in_progress'
    db.session.commit()
    
    return jsonify({"success": True, "message": "Ticket assigned successfully"}), 200
