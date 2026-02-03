import React, { useState, useRef, useEffect, useCallback } from 'react'

const backgrounds = [
  { name: 'hearts', path: '/assets/hearts.png' },
  { name: 'brown', path: '/assets/brown.png' },
  { name: 'polka dots', path: '/assets/polkadots.png' },
  { name: 'green stripes', path: '/assets/greenstripes.png' },
  { name: 'multi stripes', path: '/assets/multistripes.png' },
  { name: 'white', path: '/assets/white.png' }
]

function App() {
  const [selectedBackground, setSelectedBackground] = useState(backgrounds[0].path)
  const [selectedFilter, setSelectedFilter] = useState('normal')
  const [stage, setStage] = useState('setup') // 'setup', 'photobooth', 'result'
  const [photos, setPhotos] = useState([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [showFlash, setShowFlash] = useState(false)
  const [finalImageData, setFinalImageData] = useState(null)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const finalCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const backgroundImageRef = useRef(null)
  const screenRef = useRef(null)

  // Wrapper to preserve scroll position during state updates
  const handleBackgroundSelect = useCallback((path) => {
    const scrollTop = screenRef.current?.scrollTop || 0
    setSelectedBackground(path)
    requestAnimationFrame(() => {
      if (screenRef.current) {
        screenRef.current.scrollTop = scrollTop
      }
    })
  }, [])

  const handleFilterSelect = useCallback((filter) => {
    const scrollTop = screenRef.current?.scrollTop || 0
    setSelectedFilter(filter)
    requestAnimationFrame(() => {
      if (screenRef.current) {
        screenRef.current.scrollTop = scrollTop
      }
    })
  }, [])

  useEffect(() => {
    if (stage === 'photobooth' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          streamRef.current = stream
          videoRef.current.srcObject = stream
          // Wait a moment for video to be ready, then start taking photos automatically
          videoRef.current.onloadedmetadata = () => {
            setTimeout(() => {
              startCountdown()
            }, 500)
          }
        })
        .catch(error => {
          alert('Error accessing camera: ' + error.message)
        })
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [stage])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = selectedBackground
    img.onload = () => {
      backgroundImageRef.current = img
    }
  }, [selectedBackground])

  // Redraw canvas when entering result stage
  useEffect(() => {
    if (stage === 'result' && finalImageData && finalCanvasRef.current) {
      console.log('Redrawing canvas in result stage')
      const canvas = finalCanvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onerror = () => {
        console.error('Failed to load final image data')
      }
      img.onload = () => {
        console.log('Final image loaded, dimensions:', img.width, 'x', img.height)
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        console.log('Canvas redrawn successfully')
      }
      img.src = finalImageData
    }
  }, [stage, finalImageData])


  const startPhotobooth = () => {
    setStage('photobooth')
    setCurrentPhotoIndex(0)
    setPhotos([])
  }

  const startCountdown = () => {
    if (currentPhotoIndex >= 4) return
    let seconds = 3
    setCountdown(seconds)
    
    const interval = setInterval(() => {
      seconds--
      if (seconds > 0) {
        setCountdown(seconds)
      } else {
        setCountdown(null)
        clearInterval(interval)
        capturePhoto()
      }
    }, 1000)
  }

  const capturePhoto = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')

    // Use a consistent aspect ratio for all photos (4:3) to match desktop behavior
    // This ensures photos look the same on mobile and desktop
    const targetAspectRatio = 4 / 3
    const videoAspectRatio = video.videoWidth / video.videoHeight
    
    let captureWidth, captureHeight, sourceX, sourceY, sourceWidth, sourceHeight
    
    if (videoAspectRatio > targetAspectRatio) {
      // Video is wider than target - crop sides
      captureHeight = video.videoHeight
      captureWidth = captureHeight * targetAspectRatio
      sourceX = (video.videoWidth - captureWidth) / 2
      sourceY = 0
      sourceWidth = captureWidth
      sourceHeight = captureHeight
    } else {
      // Video is taller than target - crop top/bottom
      captureWidth = video.videoWidth
      captureHeight = captureWidth / targetAspectRatio
      sourceX = 0
      sourceY = (video.videoHeight - captureHeight) / 2
      sourceWidth = captureWidth
      sourceHeight = captureHeight
    }
    
    canvas.width = captureWidth
    canvas.height = captureHeight
    
    // Draw the cropped video frame with mirroring
    // Mirror the context before drawing the video
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    // When mirroring, we need to adjust sourceX to account for the flip
    // The sourceX from the right side becomes the left side after mirroring
    const mirroredSourceX = video.videoWidth - sourceX - sourceWidth
    ctx.drawImage(video, mirroredSourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
    ctx.restore()
    
    if (selectedFilter === 'blackwhite') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        data[i] = gray
        data[i + 1] = gray
        data[i + 2] = gray
      }
      ctx.putImageData(imageData, 0, 0)
    } else if (selectedFilter === 'sepia') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        // Sepia filter formula
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189))
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168))
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131))
      }
      ctx.putImageData(imageData, 0, 0)
    }
    
    const photoData = canvas.toDataURL('image/png')
    
    setShowFlash(true)
    setTimeout(() => {
      setShowFlash(false)
    }, 200)
    
    const newIndex = currentPhotoIndex + 1
    
    // Add photo to array first
    setPhotos(prev => {
      const allPhotos = [...prev, photoData]
      
      if (allPhotos.length === 4) {
        // This is the 4th photo - stop camera immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
        
        // Create final image immediately - ensure canvas is in DOM
        setTimeout(() => {
          // Force a re-render to ensure canvas is available, then create image
          setTimeout(() => {
            createFinalImage(allPhotos)
          }, 100)
        }, 300)
      }
      
      return allPhotos
    })
    
    if (newIndex >= 4) {
      // Keep index at 3 (0-indexed, so 3 means 4th photo taken)
      setCurrentPhotoIndex(3)
    } else {
      setCurrentPhotoIndex(newIndex)
      // Automatically start countdown for next photo after a short delay
      setTimeout(() => {
        startCountdown()
      }, 1000)
    }
  }

  const createFinalImage = (photosToUse) => {
    console.log('createFinalImage called with', photosToUse.length, 'photos')
    
    const finalCanvas = finalCanvasRef.current
    if (!finalCanvas) {
      console.error('Final canvas not available')
      return
    }
    
    const bgImg = backgroundImageRef.current
    if (!bgImg) {
      console.error('Background image not loaded, loading now...')
      // Load background image if not already loaded
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = selectedBackground
      img.onload = () => {
        backgroundImageRef.current = img
        createFinalImage(photosToUse)
      }
      img.onerror = () => {
        console.error('Failed to load background image')
        setStage('result')
      }
      return
    }
    
    console.log('Background image loaded, dimensions:', bgImg.width, 'x', bgImg.height)
    
    const ctx = finalCanvas.getContext('2d')
    finalCanvas.width = bgImg.width
    finalCanvas.height = bgImg.height
    
    // Draw background first
    ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height)
    
    // Calculate positions for 4 photos to fit in the black frames
    // The background has 4 black frames arranged vertically
    // Make photos slightly smaller than frames to ensure they fit
    // Scale images to be 1.2 times bigger
    const photoWidth = bgImg.width * 0.7 * 1.2
    const photoHeight = bgImg.height / 4 * 0.65 * 1.2
    const photoX = (bgImg.width - photoWidth) / 2
    const spacing = bgImg.height / 4 * 0.85  // Reduced spacing between photos
    const startY = spacing * 0.225  // Top image drawn higher
    
    let loadedCount = 0
    const totalPhotos = photosToUse.length
    
    console.log('Starting to composite', totalPhotos, 'photos')
    console.log('Photo dimensions:', photoWidth, 'x', photoHeight)
    console.log('Photo X position:', photoX)
    
    if (totalPhotos === 0) {
      console.error('No photos to composite')
      setStage('result')
      return
    }
    
    // Use Promise.all to ensure all images are loaded before setting stage
    const imagePromises = photosToUse.map((photoData, index) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onerror = () => {
          console.error(`Failed to load photo ${index + 1}`)
          reject(new Error(`Failed to load photo ${index + 1}`))
        }
        img.onload = () => {
          console.log(`Photo ${index + 1} loaded, dimensions:`, img.width, 'x', img.height)
          const photoY = startY + (spacing * index)
          
          // Calculate dimensions that maintain aspect ratio and fit within the frame
          const photoAspectRatio = img.width / img.height
          const frameAspectRatio = photoWidth / photoHeight
          
          let drawWidth, drawHeight, drawX, drawY
          
          if (photoAspectRatio > frameAspectRatio) {
            // Photo is wider - fit to width, center vertically
            drawWidth = photoWidth
            drawHeight = photoWidth / photoAspectRatio
            drawX = photoX
            drawY = photoY + (photoHeight - drawHeight) / 2
          } else {
            // Photo is taller - fit to height, center horizontally
            drawHeight = photoHeight
            drawWidth = photoHeight * photoAspectRatio
            drawX = photoX + (photoWidth - drawWidth) / 2
            drawY = photoY
          }
          
          console.log(`Drawing photo ${index + 1} at position:`, drawX, drawY, 'with size:', drawWidth, 'x', drawHeight)
          
          // Draw the photo onto the canvas maintaining aspect ratio
          ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawWidth, drawHeight)
          console.log(`Photo ${index + 1} drawn successfully`)
          resolve()
        }
        img.src = photoData
      })
    })
    
    Promise.all(imagePromises)
      .then(() => {
        console.log('All photos composited successfully')
        // Wait a moment to ensure all drawing is complete, then save the image
        setTimeout(() => {
          // Get the canvas data URL before changing stage
          const imageData = finalCanvas.toDataURL('image/png')
          console.log('Final image data URL length:', imageData.length)
          setFinalImageData(imageData)
          console.log('Final image data saved, dimensions:', finalCanvas.width, 'x', finalCanvas.height)
          setStage('result')
        }, 100)
      })
      .catch((error) => {
        console.error('Error compositing photos:', error)
        setStage('result')
      })
  }

  const getFinalImageBlob = () => {
    if (finalCanvasRef.current) {
      return new Promise((resolve) => {
        finalCanvasRef.current.toBlob((blob) => resolve(blob), 'image/png')
      })
    }
    if (finalImageData) {
      return fetch(finalImageData).then((response) => response.blob())
    }
    return Promise.resolve(null)
  }

  const downloadImage = async () => {
    const blob = await getFinalImageBlob()
    if (!blob) return

    const filename = 'photobooth-image.png'
    const file = new File([blob], filename, { type: blob.type || 'image/png' })

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Tiny Photobooth',
          text: 'Your photo strip'
        })
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = filename
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const restart = () => {
    setPhotos([])
    setCurrentPhotoIndex(0)
    setStage('setup')
    setFinalImageData(null)
  }

  if (stage === 'setup') {
    return (
      <div
        ref={screenRef}
        className="screen"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 'clamp(3px, 1vw, 8px)',
          backgroundColor: '#F5F5DC',
          paddingTop: 'clamp(10px, 3vh, 30px)',
          paddingBottom: 'clamp(10px, 3vh, 30px)'
        }}
      >
        <div style={{
          backgroundColor: '#FFE5E5',
          padding: 'clamp(4px, 1vw, 8px) clamp(8px, 2vw, 16px)',
          borderRadius: 'clamp(8px, 1.5vw, 16px)',
        }}>
          <img
            src="/assets/tinyphotoboothlogo.png"
            alt="tiny photobooth"
            style={{
              width: 'clamp(150px, 25vw, 300px)',
              height: 'auto',
              display: 'block',
              borderRadius: 'clamp(8px, 1.5vw, 16px)'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px, 1vw, 8px)' }}>
          <label style={{ fontSize: 'clamp(12px, 2vw, 16px)' }}>select background:</label>
          <div style={{ 
            display: 'flex', 
            gap: 'clamp(6px, 1.5vw, 12px)', 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            maxWidth: '90vw',
            padding: 'clamp(3px, 0.5vw, 6px)'
          }}>
            {backgrounds.map((bg, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: 'clamp(2px, 0.5vw, 4px)',
                flexShrink: 0
              }}>
                <img 
                  src={bg.path} 
                  alt={bg.name}
                  tabIndex={-1}
                  draggable={false}
                  style={{ 
                    width: 'clamp(70px, 12vw, 140px)', 
                    height: 'auto',
                    cursor: 'pointer',
                    border: 'clamp(2px, 0.4vw, 4px) solid ' + (selectedBackground === bg.path ? '#FFB6C1' : 'transparent'),
                    boxSizing: 'border-box'
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleBackgroundSelect(bg.path)
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleBackgroundSelect(bg.path)
                  }}
                />
                <div style={{ fontSize: 'clamp(10px, 1.5vw, 14px)' }}>{bg.name}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px, 1vw, 8px)' }}>
          <label style={{ fontSize: 'clamp(12px, 2vw, 16px)' }}>select filter:</label>
          <select 
            value={selectedFilter} 
            onChange={(e) => handleFilterSelect(e.target.value)}
            style={{
              fontSize: 'clamp(16px, 2vw, 18px)',
              padding: 'clamp(4px, 1vw, 8px)',
              minWidth: 'clamp(120px, 20vw, 200px)'
            }}
          >
            <option value="normal">normal</option>
            <option value="blackwhite">black & white</option>
            <option value="sepia">sepia</option>
          </select>
        </div>
        
        <img
          src="/assets/start.png"
          alt="start photobooth"
          onClick={startPhotobooth}
          style={{
            width: 'clamp(150px, 25vw, 300px)',
            height: 'auto',
            cursor: 'pointer',
            display: 'block',
            borderRadius: 'clamp(10px, 1.5vw, 20px)'
          }}
        />
      </div>
    )
  }

  if (stage === 'photobooth') {
    return (
      <div
        className="screen screen--photobooth"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 'clamp(10px, 3vw, 30px)',
          paddingTop: 'clamp(10px, 5vh, 50px)',
          paddingBottom: 'clamp(10px, 5vh, 50px)'
        }}
      >
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="video-preview"
          style={{ 
            filter: selectedFilter === 'blackwhite' 
              ? 'grayscale(100%)' 
              : selectedFilter === 'sepia' 
              ? 'sepia(100%)' 
              : 'none',
            transform: 'scaleX(-1)'
          }}
        ></video>
        <div style={{
          display: 'flex',
          gap: 'clamp(8px, 2vw, 16px)',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              style={{
                width: 'clamp(10px, 2.5vw, 16px)',
                height: 'clamp(10px, 2.5vw, 16px)',
                borderRadius: '50%',
                border: '2px solid white',
                backgroundColor: photos.length > index ? 'white' : 'transparent',
                transition: 'background-color 0.3s ease'
              }}
            />
          ))}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        <canvas ref={finalCanvasRef} style={{ display: 'none' }}></canvas>
        {countdown !== null && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(60px, 15vw, 150px)',
            zIndex: 10000,
            fontWeight: 'bold'
          }}>
            {countdown}
          </div>
        )}
        {showFlash && stage === 'photobooth' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'white',
            zIndex: 9999,
            pointerEvents: 'none'
          }}></div>
        )}
        <div style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}>
          Photo {Math.min(currentPhotoIndex + 1, 4)} of 4
        </div>
        {photos.length === 4 && (
          <div style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}>
            creating your photo strip...
          </div>
        )}
      </div>
    )
  }

  if (stage === 'result') {
    return (
      <div
        className="screen"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'flex-start',
          gap: 'clamp(5px, 1.5vw, 10px)',
          backgroundColor: '#F5F5DC',
          paddingTop: 'clamp(10px, 3vh, 30px)',
          paddingBottom: 'clamp(10px, 3vh, 30px)'
        }}
      >
        <div style={{
          backgroundColor: '#FFE5E5',
          padding: 'clamp(4px, 1vw, 8px) clamp(8px, 2vw, 16px)',
          borderRadius: 'clamp(8px, 1.5vw, 16px)',
        }}>
          <img
            src="/assets/tinyphotoboothlogo.png"
            alt="tiny photobooth"
            style={{
              width: 'clamp(150px, 25vw, 300px)',
              height: 'auto',
              display: 'block',
              borderRadius: 'clamp(8px, 1.5vw, 16px)'
            }}
          />
        </div>
        <div style={{ fontSize: 'clamp(18px, 3.5vw, 28px)', marginBottom: 'clamp(10px, 2vw, 20px)' }}>
          printing your photos...
        </div>
        <canvas 
          ref={finalCanvasRef} 
          className="photostrip-slide"
          style={{ 
            maxWidth: 'min(200px, 40vw)',
            maxHeight: 'min(60vh, 500px)',
            width: 'auto',
            height: 'auto', 
            border: 'clamp(1px, 0.2vw, 2px) solid #ccc', 
            display: 'block'
          }}
        ></canvas>
        <div style={{ 
          display: 'flex', 
          gap: 'clamp(8px, 2vw, 16px)',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button 
            onClick={downloadImage}
            className="photobooth-button"
            style={{
              fontSize: 'clamp(14px, 2.5vw, 20px)',
              padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)',
              cursor: 'pointer'
            }}
          >
            download image
          </button>
          <button 
            onClick={restart}
            className="photobooth-button"
            style={{
              fontSize: 'clamp(14px, 2.5vw, 20px)',
              padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)',
              cursor: 'pointer'
            }}
          >
            start over
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default App