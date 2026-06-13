import type { CollectionConfig } from 'payload'

// Utilisateurs admin — accès restreint, pas d'inscription publique
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Administration',
    defaultColumns: ['email', 'role', 'createdAt'],
  },
  labels: {
    singular: 'Utilisateur',
    plural: 'Utilisateurs',
  },
  // Sécurité : aucune inscription publique possible
  auth: {
    tokenExpiration: 7200, // 2h
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600000, // 10 min
  },
  access: {
    // Seul un admin peut créer/supprimer d'autres utilisateurs
    create: ({ req }) => req.user?.role === 'admin',
    read: ({ req }) => !!req.user,
    update: ({ req, id }) => req.user?.role === 'admin' || req.user?.id === id,
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'role',
      label: 'Rôle',
      type: 'select',
      options: [
        { label: 'Administrateur', value: 'admin' },
        { label: 'Éditeur', value: 'editor' },
        { label: 'Confirmatrice', value: 'confirmatrice' },
      ],
      defaultValue: 'editor',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'active',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Désactiver pour exclure de la distribution automatique',
      },
    },
    {
      name: 'firstName',
      label: 'Prénom',
      type: 'text',
    },
    {
      name: 'lastName',
      label: 'Nom',
      type: 'text',
    },

    // ── Champs spécifiques aux confirmatrices (masqués si autre rôle) ─────────
    {
      name: 'confirmatriceType',
      label: 'Type de confirmatrice',
      type: 'select',
      options: [
        { label: 'Salariée (fixe + prime au-dessus du seuil)', value: 'salarie' },
        { label: 'Non-salariée (prime par commande uniquement)', value: 'non_salarie' },
      ],
      admin: {
        condition: (data) => data.role === 'confirmatrice',
        description: 'Détermine le mode de calcul de la rémunération',
      },
    },
    {
      name: 'salaireMensuel',
      label: 'Salaire mensuel (DA)',
      type: 'number',
      min: 0,
      admin: {
        condition: (data) => data.role === 'confirmatrice' && data.confirmatriceType === 'salarie',
        description: 'Salaire fixe versé si le seuil de commandes livrées est atteint',
      },
    },
    {
      name: 'seuilCommandes',
      label: 'Seuil commandes livrées (déblocage)',
      type: 'number',
      min: 0,
      admin: {
        condition: (data) => data.role === 'confirmatrice' && data.confirmatriceType === 'salarie',
        description: 'Nombre minimum de commandes livrées pour débloquer le salaire + prime',
      },
    },
    {
      name: 'primeParCommande',
      label: 'Prime par commande livrée (DA)',
      type: 'number',
      min: 0,
      admin: {
        condition: (data) => data.role === 'confirmatrice',
        description: 'Prime additionnelle par commande livrée (pour tous les types)',
      },
    },
  ],
  timestamps: true,
}
