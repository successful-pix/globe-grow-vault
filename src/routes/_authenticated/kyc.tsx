import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/kyc')({
  component: KYCPage,
})

function KYCPage() {
  const [fullName, setFullName] = useState('')
  const [documentType, setDocumentType] = useState('National ID')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !documentFile || !selfieFile) {
      toast.error('Please fill all fields and upload both files')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload Document
      const docFileName = `kyc/${user.id}/document-${Date.now()}`
      const { error: docError } = await supabase.storage
        .from('kyc')
        .upload(docFileName, documentFile)

      if (docError) throw docError

      // Upload Selfie
      const selfieFileName = `kyc/${user.id}/selfie-${Date.now()}`
      const { error: selfieError } = await supabase.storage
        .from('kyc')
        .upload(selfieFileName, selfieFile)

      if (selfieError) throw selfieError

      // Save KYC record
      const { error: dbError } = await supabase.from('kyc_submissions').insert({
        user_id: user.id,
        full_name: fullName,
        document_type: documentType,
        document_path: docFileName,
        selfie_path: selfieFileName,
        status: 'pending',
      })

      if (dbError) throw dbError

      toast.success('KYC submitted successfully! Waiting for approval.')
      setStatus('pending')
      setFullName('')
      setDocumentFile(null)
      setSelfieFile(null)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to submit KYC')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-lg mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">KYC Verification</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete your identity verification to unlock full features
          </p>
        </CardHeader>

        <CardContent>
          {status === 'pending' ? (
            <div className="text-center py-8">
              <p className="text-yellow-500 font-medium text-lg">KYC Under Review</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your documents have been submitted. Please wait for admin approval.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full legal name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Document Type</Label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3"
                >
                  <option value="National ID">National ID</option>
                  <option value="Passport">Passport</option>
                  <option value="Driver License">Driver License</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Upload Document</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Selfie</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit KYC'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
