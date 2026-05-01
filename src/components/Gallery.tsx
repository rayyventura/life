"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import styles from "./Gallery.module.css"
import { formatDateShort } from "@/lib/utils"
import type { Photo } from "@/lib/db"

interface GalleryPhoto extends Photo {
  entry_date?: string
  entry_title?: string
}

export default function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null)

  if (!photos.length) {
    return (
      <div className="empty">
        <span className="empty-icon">▣</span>
        <p className="empty-text">No memories yet. Add photos to your journal entries.</p>
        <Link href="/journal" className="btn btn-outline">Go to Journal</Link>
      </div>
    )
  }

  return (
    <>
      {lightbox && (
        <div className="modal-backdrop" onClick={() => setLightbox(null)}>
          <div className={styles.lightbox} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setLightbox(null)} style={{ position: "absolute", top: "1rem", right: "1rem" }}>×</button>
            <div className={styles.lightboxImg}>
              <Image
                src={lightbox.url}
                alt={lightbox.caption ?? "Memory"}
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
            <div className={styles.lightboxMeta}>
              {lightbox.caption && <p className={styles.lightboxCaption}>{lightbox.caption}</p>}
              {lightbox.entry_date && (
                <Link href={`/journal/${lightbox.entry_date}`} className={styles.lightboxLink}>
                  {lightbox.entry_title ?? formatDateShort(lightbox.entry_date)} →
                </Link>
              )}
              <span className={styles.lightboxDate}>{formatDateShort(lightbox.created_at)}</span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className={styles.item}
            style={{ animationDelay: `${i * 0.04}s` }}
            onClick={() => setLightbox(photo)}
          >
            <div className={styles.imgWrap}>
              <Image
                src={photo.url}
                alt={photo.caption ?? "Memory"}
                fill
                sizes="(max-width: 600px) 50vw, 25vw"
                style={{ objectFit: "cover" }}
              />
              <div className={styles.overlay}>
                <span className={styles.viewIcon}>↗</span>
                {photo.entry_date && (
                  <span className={styles.overlayDate}>{formatDateShort(photo.entry_date)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
