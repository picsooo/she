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
  ],
  timestamps: true,
}
