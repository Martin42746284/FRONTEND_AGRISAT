import re

with open('services.ts', 'r') as f:
    content = f.read()

# Trouver le pattern : "modes?: string[];\n  };\n};"
# et le remplacer par le même + nouveau bloc
old = "  modes?: string[];\n  };\n};"
new = """  modes?: string[];
  };
};

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
}"""

if old in content:
    content = content.replace(old, new, 1)
    with open('services.ts', 'w') as f:
        f.write(content)
    print('OK: interfaces ajoutées proprement')
else:
    print('ERREUR: pattern non trouvé')
    # Debug: chercher les lignes autour
    for i, line in enumerate(content.split('\n')):
        if 'modes?: string[];' in line:
            print(f'Ligne {i+1}: {repr(line)}')
            if i+1 < len(content.split('\n')):
                print(f'Ligne {i+2}: {repr(lines[i+1])}')
