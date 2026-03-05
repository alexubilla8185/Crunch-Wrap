import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveInsight } from '@/lib/storage/localDbService';
import { parseFile } from '@/lib/utils/fileParser';
import { useUIStore } from '@/lib/store';
import type { Insight } from '@/lib/schemas';

export function useFileDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const router = useRouter();
  const { showToast } = useUIStore();

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        showToast('PDFs are not supported in this lightweight version.', 'error');
        continue;
      }

      try {
        const parsedContent = await parseFile(file);
        const now = new Date().toISOString();
        
        const newInsight: Insight = {
          id: crypto.randomUUID(),
          title: file.name,
          raw_content: parsedContent,
          processing_status: 'local',
          created_at: now,
          updated_at: now,
        };

        await saveInsight(newInsight);
        console.log('Successfully saved insight locally:', newInsight.id);
        
        if (fileArray.length === 1) {
          router.push(`/dashboard/files/${newInsight.id}`);
        }
      } catch (error) {
        console.error('Error processing dropped file:', error);
        showToast(`Failed to import ${file.name}`, 'error');
      }
    }
    
    if (fileArray.length > 1) {
      router.push('/dashboard/files');
    }
    
    showToast('Importing documents...', 'info');
  }, [router, showToast]);

  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  }, [processFiles]);

  return {
    isDragging,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    handleFileInput,
  };
}
