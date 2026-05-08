import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Building2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompanyForm from './CompanyForm';

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.Company.list('order');
    setCompanies(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta empresa?')) return;
    await base44.entities.Company.delete(id);
    load();
  };

  const handleSave = async (data) => {
    if (editing) {
      await base44.entities.Company.update(editing.id, data);
    } else {
      await base44.entities.Company.create(data);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-grotesk font-bold text-2xl">Empresas & Parceiros</h2>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-gold text-background hover:bg-gold-dark">
          <Plus className="w-4 h-4 mr-2" /> Nova Empresa
        </Button>
      </div>

      {showForm && (
        <div className="mb-6">
          <CompanyForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(company => (
            <div key={company.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{company.name}</h3>
                  <p className="text-xs text-muted-foreground">{company.category}</p>
                </div>
                <div className="flex items-center gap-1">
                  {company.is_active ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {company.is_partner && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">Parceiro</span>}
                {company.points_accepted && <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">Aceita pts</span>}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(company); setShowForm(true); }} className="flex-1 text-xs">
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(company.id)} className="flex-1 text-xs text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}