import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DoseResponseService } from '../../services/dose-response.service';

@Component({
  selector: 'app-file-upload',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss'
})
export class FileUploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  isUploading = false;
  dragOver = false;

  constructor(
    private doseResponseService: DoseResponseService,
    private snackBar: MatSnackBar
  ) {}

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFile(input.files[0]);
    }
  }

  /**
   * Handle drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  /**
   * Handle drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  /**
   * Handle file drop
   */
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    
    if (event.dataTransfer?.files?.length) {
      this.uploadFile(event.dataTransfer.files[0]);
    }
  }

  /**
   * Open file dialog
   */
  openFileDialog(): void {
    this.fileInput.nativeElement.click();
  }

  /**
   * Upload and process file
   */
  private async uploadFile(file: File): Promise<void> {
    // Validate file type
    const validTypes = ['.csv', '.txt', '.tsv'];
    const fileName = file.name.toLowerCase();
    const isValidType = validTypes.some(type => fileName.endsWith(type));

    if (!isValidType) {
      this.snackBar.open(
        'Please select a CSV, TXT, or TSV file',
        'Close',
        { duration: 3000 }
      );
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.snackBar.open(
        'File size must be less than 10MB',
        'Close',
        { duration: 3000 }
      );
      return;
    }

    try {
      this.isUploading = true;
      await this.doseResponseService.loadData(file);
      
      this.snackBar.open(
        `File "${file.name}" uploaded successfully!`,
        'Close',
        { duration: 3000 }
      );
    } catch (error) {
      this.snackBar.open(
        'Error uploading file. Please check the format.',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.isUploading = false;
      // Reset file input
      this.fileInput.nativeElement.value = '';
    }
  }
}
