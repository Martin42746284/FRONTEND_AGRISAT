import re

with open('services.ts', 'r') as f:
    content = f.read()

# Trouver le bloc qui commence par "  modes?: string[];\n  };\n" 
# et qui se termine avant le prochain "/**"
pattern = r'(  modes?: string\[\];\n  };\n)(.*?)(\n/\*\*)'

def replacer(m):
    prefix = m.group(1)
    # Le contenu entre le prefix et le prochain /** est le bloc à remplacer
    # On garde le prefix et on insère le nouveau bloc après
    new_block = '''

/** Payload PATCH /api/parcelles/{id} — correction humaine d'une parcelle. */
export interface ParcelUpdate {
  culture_detected?: string;
  confidence?: number; // 0–100
  verdict?: string;
  details?: string;
  saison?: string;
}

/** Création d'une entrée d'audit (journal des actions utilisateurs). */
export interface AuditEntryCreate {
  user_name: string;
  action: string; // ex. 'correction', 'rejet', 'observation', 'connexion'
  object: string;   // ex. 'Parcelle <id>', 'Session analyste'
}

/** Entrée d'audit renvoyée par l'API. */
export interface AuditEntry {
  id: string;
  at: string;
  user_name: string;
  action: string;
  object: string;
}
'''
    return prefix + new_block + m.group(3)

new_content, count = re.subn(pattern, replacer, content, flags=re.DOTALL)
if count == 0:
    print("ERREUR: pattern non trouvé")
else:
    with open('services.ts', 'w') as f:
        f.write(new_content)
    print(f'OK: {count} remplacement effectué')
