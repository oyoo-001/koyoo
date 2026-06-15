import React, { useState } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import KoyooLogo from "@/components/koyoo/KoyooLogo";
import { Upload, FileCheck, ShieldCheck, Loader2, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function DocUploadCard({ title, description, icon: Icon, url, onUpload, uploading }) {
  return (
    <div className={`border rounded-2xl p-4 space-y-3 transition-colors ${url ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${url ? "bg-primary/20" : "bg-secondary"}`}>
          {url ? <CheckCircle2 size={20} className="text-primary" /> : <Icon size={20} className="text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{url ? "Uploaded ✓" : description}</p>
        </div>
      </div>
      <label className="block">
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={onUpload}
          disabled={uploading}
        />
        <div className={`w-full h-10 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium cursor-pointer transition-colors ${
          url
            ? "border-primary/30 text-primary hover:bg-primary/10"
            : "border-border text-muted-foreground hover:border-primary hover:text-primary"
        }`}>
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading...</>
          ) : url ? (
            <><Upload size={16} /> Replace</>
          ) : (
            <><Upload size={16} /> Choose file</>
          )}
        </div>
      </label>
    </div>
  );
}

export default function DriverOnboarding({ profile, onComplete }) {
  const { toast } = useToast();
  const [licenseUrl, setLicenseUrl] = useState(profile?.license_url || "");
  const [insuranceUrl, setInsuranceUrl] = useState(profile?.insurance_url || "");
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingInsurance, setUploadingInsurance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!(profile?.license_url && profile?.insurance_url));

  const handleUpload = async (file, type) => {
    const setUploading = type === "license" ? setUploadingLicense : setUploadingInsurance;
    const setUrl = type === "license" ? setLicenseUrl : setInsuranceUrl;
    setUploading(true);
    const { file_url } = await api.integrations.Core.UploadFile(file);
    setUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!licenseUrl || !insuranceUrl) return;
    setSubmitting(true);
    try {
      await api.entities.DriverProfile.update(profile.id, {
        license_url: licenseUrl,
        insurance_url: insuranceUrl,
      });
      setSubmitted(true);
      toast({ title: "Documents submitted!", description: "An admin will review and verify them shortly." });
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const bothUploaded = licenseUrl && insuranceUrl;

  if (submitted || (profile?.license_url && profile?.insurance_url && !profile?.documents_verified)) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-yellow-500/20 rounded-3xl flex items-center justify-center mb-5">
          <Clock size={40} className="text-yellow-500" />
        </div>
        <h2 className="font-heading font-bold text-2xl mb-2">Under Review</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Your documents have been submitted. An admin will verify them before you can go online. Check back soon!
        </p>
        <div className="mt-6 space-y-2 w-full max-w-xs">
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
            <CheckCircle2 size={18} className="text-primary shrink-0" />
            <span className="text-sm">Driver's license submitted</span>
          </div>
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
            <CheckCircle2 size={18} className="text-primary shrink-0" />
            <span className="text-sm">Vehicle insurance submitted</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="p-5 pt-10 flex-1 overflow-y-auto max-w-lg mx-auto w-full">
        <div className="mb-6">
          <KoyooLogo size="sm" />
        </div>

        <div className="space-y-2 mb-6">
          <h1 className="font-heading font-bold text-2xl">Complete your profile</h1>
          <p className="text-muted-foreground text-sm">
            Upload your documents to get verified and start accepting rides.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { label: "License", done: !!licenseUrl },
            { label: "Insurance", done: !!insuranceUrl },
            { label: "Review", done: false },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {step.done ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium ${step.done ? "text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-border" />}
            </React.Fragment>
          ))}
        </div>

        <div className="space-y-4">
          <DocUploadCard
            title="Driver's License"
            description="Front side of your valid driver's license"
            icon={FileCheck}
            url={licenseUrl}
            uploading={uploadingLicense}
            onUpload={(e) => e.target.files[0] && handleUpload(e.target.files[0], "license")}
          />
          <DocUploadCard
            title="Vehicle Insurance"
            description="Current vehicle insurance certificate"
            icon={ShieldCheck}
            url={insuranceUrl}
            uploading={uploadingInsurance}
            onUpload={(e) => e.target.files[0] && handleUpload(e.target.files[0], "insurance")}
          />
        </div>

        <div className="mt-6 p-4 bg-secondary rounded-2xl text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">What happens next?</p>
          <p>1. Submit your documents below</p>
          <p>2. An admin reviews and verifies them (usually within 24h)</p>
          <p>3. Once verified, you can go online and accept rides</p>
        </div>
      </div>

      <div className="p-5 pb-8 max-w-lg mx-auto w-full">
        <Button
          onClick={handleSubmit}
          disabled={!bothUploaded || submitting}
          className="w-full h-14 rounded-2xl text-base font-bold"
        >
          {submitting ? (
            <><Loader2 size={20} className="animate-spin" /> Submitting...</>
          ) : (
            "Submit for Verification"
          )}
        </Button>
      </div>
    </div>
  );
}