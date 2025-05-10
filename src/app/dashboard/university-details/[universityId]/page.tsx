'use client';

import { notFound } from 'next/navigation';
import { UNIVERSITIES } from '@/lib/universitiesData';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Types
import type { University, UniversityReview } from '@/types';

function StarRating({ value, readOnly, onChange }: { value: number, readOnly?: boolean, onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(star)}
          className={star <= value ? 'text-yellow-500' : 'text-gray-300'}
        >
          <Star className="w-5 h-5" fill={star <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default function UniversityDetailsPage({ params }: { params: { universityId: string } }) {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState<UniversityReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [myReview, setMyReview] = useState<UniversityReview | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const university: University | undefined = UNIVERSITIES.find(u => u.id === params.universityId);
  if (!university) return notFound();

  // Fetch reviews from Firestore
  useEffect(() => {
    if (!university) return;
    const universityId = university && university.id;
    async function fetchReviews() {
      setLoading(true);
      const { db: firestoreDb } = getFirebaseServices();
      if (!firestoreDb || !universityId) {
        setReviews([]);
        setLoading(false);
        return;
      }
      const q = query(collection(firestoreDb, 'universities', universityId, 'reviews'));
      const snap = await getDocs(q);
      const data: UniversityReview[] = [];
      let mine: UniversityReview | null = null;
      snap.forEach(docSnap => {
        const r = { id: docSnap.id, ...docSnap.data() } as UniversityReview;
        data.push(r);
        if (currentUser?.userType === 'alumni' && r.alumniId === currentUser.uid) mine = r;
      });
      setReviews(data);
      setMyReview(mine);
      setRating(mine && typeof (mine as UniversityReview).rating === 'number' ? (mine as UniversityReview).rating : 0);
      setReviewText(mine && typeof (mine as UniversityReview).review === 'string' ? (mine as UniversityReview).review : '');
      setLoading(false);
    }
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [university?.id, currentUser?.uid, currentUser?.userType]);

  // Submit review (alumni only)
  async function handleSubmitReview() {
    if (!currentUser || currentUser.userType !== 'alumni' || !university) return;
    setSubmitting(true);
    const { db: firestoreDb } = getFirebaseServices();
    if (!firestoreDb) {
      setSubmitting(false);
      return;
    }
    const reviewData = {
      alumniId: currentUser.uid,
      alumniName: currentUser.fullName,
      rating,
      review: reviewText,
      timestamp: Date.now(),
      universityId: university.id,
    };
    if (myReview) {
      // Update
      await setDoc(doc(firestoreDb, 'universities', university.id, 'reviews', myReview.id), reviewData);
    } else {
      // Add
      await addDoc(collection(firestoreDb, 'universities', university.id, 'reviews'), reviewData);
    }
    setSubmitting(false);
    // Refresh reviews
    const q = query(collection(firestoreDb, 'universities', university.id, 'reviews'));
    const snap = await getDocs(q);
    const data: UniversityReview[] = [];
    let mine: UniversityReview | null = null;
    snap.forEach(docSnap => {
      const r = { id: docSnap.id, ...docSnap.data() } as UniversityReview;
      data.push(r);
      if (currentUser?.userType === 'alumni' && r.alumniId === currentUser.uid) mine = r;
    });
    setReviews(data);
    setMyReview(mine);
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <img src={`https://picsum.photos/seed/${university.logoSeed}/64/64`} alt={university.name} className="h-12 w-12 rounded" />
            {university.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-2">
              <div><b>Official Website:</b> <a href={university.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{university.link}</a></div>
              <div className="flex items-center gap-2"><b>Alumni Rating:</b> <StarRating value={university.avgRating} readOnly /> <span>({university.avgRating}/5, {university.reviewCount} reviews)</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Admission Details & Process</CardTitle></CardHeader>
        <CardContent>
          <div><b>Requirements:</b> {university.admission.requirements}</div>
          <div><b>Deadline:</b> {university.admission.deadline}</div>
          <div><b>Required Documents:</b> {university.admission.documents.join(', ')}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Visa Information</CardTitle></CardHeader>
        <CardContent>
          <div><b>Visa Type:</b> {university.visa.type}</div>
          <div><b>Steps:</b>
            <ol className="list-decimal ml-6">
              {university.visa.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
          {university.visa.fee && <div><b>Fee:</b> {university.visa.fee}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Abroad Scholarships</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {university.scholarships.map((sch, i) => (
              <li key={i}>
                <b>{sch.name}:</b> {sch.description} <br />
                <span className="text-sm">Eligibility: {sch.eligibility}</span><br />
                <a href={sch.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Application Link</a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alumni Reviews</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div>Loading reviews...</div> : (
            <ul className="space-y-4">
              {reviews.length === 0 && <li>No reviews yet.</li>}
              {reviews.map(r => (
                <li key={r.id} className="border-b pb-2">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} readOnly />
                    <span className="font-semibold">{r.alumniName}</span>
                    <span className="text-xs text-gray-400">{new Date(r.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="ml-2 text-muted-foreground">{r.review}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {currentUser?.userType === 'alumni' && (
        <Card>
          <CardHeader><CardTitle>Submit Your Review</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Your Rating:</span>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <textarea
                className="w-full border rounded p-2"
                maxLength={500}
                rows={3}
                placeholder="Write your review (max 500 chars)"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                disabled={submitting}
              />
              <Button onClick={handleSubmitReview} disabled={submitting || !rating || !reviewText.trim()}>
                {myReview ? 'Update Review' : 'Submit Review'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
