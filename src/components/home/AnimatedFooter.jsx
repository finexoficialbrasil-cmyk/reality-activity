import { motion } from 'framer-motion';
import { Zap, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AnimatedFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
  { label: 'Início', href: '/' },
  { label: 'Empresas', href: '/vitrine' },
  { label: 'Resgatar', href: '/catalog' }];


  const socialLinks = [
  { icon: '📱', label: 'Instagram', href: '#' },
  { icon: '🐦', label: 'Twitter', href: '#' },
  { icon: '💼', label: 'LinkedIn', href: '#' }];


  return (
    <footer className="border-t border-border px-4 py-12 bg-gradient-to-t from-card/30 to-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <img
                src="https://media.base44.com/images/public/69fe21208143d5c488dd2503/b517edfd8_5784ef057caa0bd01e47b4659fd6ccbb.webp"
                alt="Reality Activity"
                className="h-8" />
              
              <span className="font-grotesk font-bold text-lg">Reality Activity</span>
            </div>
            <p className="text-sm text-muted-foreground">Assista conteúdo, acumule pontos e resgate recompensas com Reality Activity!</p>
          </motion.div>

          {/* Links */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h4 className="font-semibold text-sm mb-4 text-foreground">Navegação</h4>
            <div className="space-y-2">
              {footerLinks.map((link) =>
              <Link key={link.href} to={link.href} className="text-sm text-muted-foreground hover:text-gold transition-colors block">
                  {link.label}
                </Link>
              )}
            </div>
          </motion.div>

          {/* Contato */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h4 className="font-semibold text-sm mb-4 text-foreground">Contato</h4>
            <div className="space-y-3">
              <a href="mailto:contato@realityactivity.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors">realityactivity.com

              </a>
              <a href="tel:+5511999999999" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors">+55 65981297511

              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" /> São Paulo, Brasil
              </div>
            </div>
          </motion.div>

          {/* Sociais */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h4 className="font-semibold text-sm mb-4 text-foreground">Siga-nos</h4>
            <div className="flex gap-3">
              {socialLinks.map((social) =>
              <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-card border border-border hover:border-gold/50 hover:bg-gold/10 transition-all flex items-center justify-center text-lg"
              title={social.label}>
                  {social.icon}
                </a>
              )}
            </div>
          </motion.div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© {currentYear} Reality Activity. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-gold transition-colors">Privacidade</a>
            <a href="#" className="hover:text-gold transition-colors">Termos</a>
            <a href="#" className="hover:text-gold transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>);

}