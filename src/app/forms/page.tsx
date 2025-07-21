'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  MoreHorizontal,
  PlusCircle,
  FileText,
  FileImage,
  Download,
  Edit,
  Trash2,
  Loader2,
  Eye,
  Printer,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import type { Document } from '@/types';
import { getDocuments, addDocument } from '@/services/documents';
import { useToast } from "@/hooks/use-toast";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";


const fileTypeIcons: Record<string, JSX.Element> = {
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  doc: <FileText className="h-5 w-5 text-blue-500" />,
  docx: <FileText className="h-5 w-5 text-blue-500" />,
  png: <FileImage className="h-5 w-5 text-green-500" />,
  jpg: <FileImage className="h-5 w-5 text-yellow-500" />,
};

export default function FormsPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents", error);
      toast({
          title: "Error",
          description: "Failed to load documents from the database.",
          variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadDocuments();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handlePrint = (url: string) => {
    const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
    printWindow?.addEventListener('load', () => {
        printWindow?.print();
    });
  };

  const handleUpload = async () => {
    if (!file || !title) {
        toast({
            title: "Validation Error",
            description: "Title and a file are required to upload.",
            variant: "destructive",
        });
        return;
    }

    setIsUploading(true);
    try {
        const storage = getStorage();
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);

        // Upload file
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Add document metadata to Firestore
        const newDocData: Omit<Document, 'id'> = {
            title,
            description,
            fileType: fileExtension,
            uploadDate: new Date(),
            url: downloadURL,
        };
        
        await addDocument(newDocData);

        toast({
            title: "Success",
            description: "Document uploaded successfully.",
        });

        // Refresh documents list
        await loadDocuments();
        
        // Close dialog and reset form
        setIsDialogOpen(false);
        resetForm();

    } catch (error) {
        console.error("Upload failed", error);
        toast({
            title: "Upload Error",
            description: "Failed to upload the document. Please check console for details.",
            variant: "destructive",
        });
    } finally {
        setIsUploading(false);
    }
  };


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Forms & Documents</h2>
          <p className="text-muted-foreground">
            Manage all your stored documents.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Select a file and provide details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input id="title" className="col-span-3" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea id="description" className="col-span-3" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">
                  File
                </Label>
                <Input id="file" type="file" className="col-span-3" onChange={handleFileChange} />
              </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>Cancel</Button>
               <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading documents from Firestore...</TableCell>
                </TableRow>
            ) : documents.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">No documents found. Upload one to get started.</TableCell>
                </TableRow>
            ) : (documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{fileTypeIcons[doc.fileType.toLowerCase()] || <FileText className="h-5 w-5" />}</TableCell>
                <TableCell className="font-medium">{doc.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {doc.description}
                </TableCell>
                <TableCell>
                  {format(doc.uploadDate, 'LLL dd, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem asChild>
                         <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                         </a>
                      </DropdownMenuItem>
                       <DropdownMenuItem onSelect={() => handlePrint(doc.url)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                       </DropdownMenuItem>
                       <DropdownMenuItem asChild>
                         <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                         </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" disabled>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
