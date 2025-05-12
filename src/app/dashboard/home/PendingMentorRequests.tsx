import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Student, User } from "@/types";

export default function PendingMentorRequests() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      if (!currentUser || currentUser.userType !== "alumni" || !currentUser.pendingMenteeRequests?.length) {
        setPendingRequests([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const studentDocs = await Promise.all(
        currentUser.pendingMenteeRequests.map(async (uid) => {
          const docSnap = await getDoc(doc(db, "users", uid));
          return docSnap.exists() ? ({ ...docSnap.data(), uid } as Student) : null;
        })
      );
      setPendingRequests(studentDocs.filter(Boolean) as Student[]);
      setLoading(false);
    }
    fetchRequests();
  }, [currentUser]);

  const handleAccept = async (studentUid: string) => {
    if (!currentUser) return;
    try {
      // Add to myMentees
      await updateDoc(doc(db, "users", currentUser.uid), {
        myMentees: arrayUnion(studentUid),
        pendingMenteeRequests: arrayRemove(studentUid),
      });
      // Add to student's myMentors
      await updateDoc(doc(db, "users", studentUid), {
        myMentors: arrayUnion(currentUser.uid),
      });
      setPendingRequests((prev) => prev.filter((s) => s.uid !== studentUid));
      toast({ title: "Request Accepted", description: "You are now a mentor for this student." });
    } catch (error) {
      toast({ title: "Error", description: "Could not accept request." });
    }
  };

  const handleDecline = async (studentUid: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        pendingMenteeRequests: arrayRemove(studentUid),
      });
      setPendingRequests((prev) => prev.filter((s) => s.uid !== studentUid));
      toast({ title: "Request Declined", description: "Request has been declined." });
    } catch (error) {
      toast({ title: "Error", description: "Could not decline request." });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!pendingRequests.length) return <div>No pending mentor requests.</div>;

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle>Pending Mentor Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {pendingRequests.map((student) => (
          <div key={student.uid} className="flex items-center justify-between border-b py-2">
            <span>{student.fullName}</span>
            <div className="flex gap-2">
              <Button onClick={() => handleAccept(student.uid)} variant="success">Accept</Button>
              <Button onClick={() => handleDecline(student.uid)} variant="destructive">Decline</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
