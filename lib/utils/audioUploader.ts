import { AudioSchema } from '@/lib/schemas';
import { useAudioStore } from '@/lib/audioStore';

export async function uploadAudio(file: File | Blob): Promise<string> {
  const { setIsUploading, setCurrentAudioUrl } = useAudioStore.getState();
  
  try {
    // Validate
    const validated = AudioSchema.parse({
      file: file,
      size: file.size,
      type: file.type,
    });

    // Upload
    setIsUploading(true);
    const response = await fetch('/api/upload/audio/signed-url', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'recording.webm', contentType: file.type }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to get signed URL:', errorData);
      throw new Error('Failed to get signed URL');
    }
    
    const { signedUrl } = await response.json();
    console.log('Got signed URL:', signedUrl);

    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: validated.file,
      headers: { 'Content-Type': file.type },
    });

    if (uploadResponse.ok) {
      const url = URL.createObjectURL(file);
      setCurrentAudioUrl(url);
      return url;
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  } finally {
    setIsUploading(false);
  }
}
