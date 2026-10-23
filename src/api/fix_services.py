lines = open('services.ts', 'r').readlines()

# Trouver la ligne qui contient '  };' après 'modes?: string[];'
# (c'est la ligne 57, index 56)
insert_after = None
for i, line in enumerate(lines):
    if 'modes?: string[];' in line:
        if i + 1 < len(lines) and lines[i+1].strip() == '};':
            insert_after = i + 1
            break

if insert_after is None:
    print("ERREUR: marqueur non trouvé")
else:
    new_block = [
        '',
        '/** Payload PATCH /api/parcelles/{id} — correction humaine d\'une parcelle. */',
        'export interface ParcelUpdate {',
        '  culture_detected?: string;',
        '  confidence?: number; // 0–100',
        '  verdict?: string;',
        '  details?: string;',
        '  saison?: string;',
        '}',
        '',
        '/** Création d\'une entrée d\'audit (journal des actions utilisateurs). */',
        'export interface AuditEntryCreate {',
        '  user_name: string;',
        "  action: string; // ex. 'correction', 'rejet', 'observation', 'connexion'",
        "  object: string;   // ex. 'Parcelle <id>', 'Session analyste'",
        '}',
        '',
        '/** Entrée d\'audit renvoyée par l\'API. */',
        'export interface AuditEntry {',
        '  id: string;',
        '  at: string;',
        '  user_name: string;',
        '  action: string;',
        '  object: string;',
        '}',
        '',
    ]
    # Chaque élément de new_lines doit se terminer par \n
    new_lines = [l + '\n' for l in new_lines]
    result = lines[:insert_after+1] + new_lines + lines[insert_after+1:]
    with open('services.ts', 'w') as f:
        f.writelines(result)
    print('OK: interfaces ajoutées correctement')
