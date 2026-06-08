'use client'
import React from 'react'
import { useRowLabel } from '@payloadcms/ui'

// Label pour chaque ligne image : affiche "Photo 1", "Photo 2", etc.
const ImageRowLabel: React.FC = () => {
  const { rowNumber } = useRowLabel()
  const num = (rowNumber ?? 0)

  return (
    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
      📷 Photo {num + 1}
    </span>
  )
}

export default ImageRowLabel
