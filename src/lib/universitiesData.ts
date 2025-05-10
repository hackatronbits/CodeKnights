import { University } from '@/types';

export const UNIVERSITIES: University[] = [
  {
    id: 'harvard',
    name: 'Harvard University',
    link: 'https://www.harvard.edu',
    logoSeed: 'harvard',
    avgRating: 4.5,
    reviewCount: 10,
    admission: {
      requirements: 'Requires SAT/ACT, 3.8+ GPA, 2 recommendation letters',
      deadline: 'Jan 1',
      documents: ['Transcripts', 'Recommendation Letters', 'Personal Statement'],
    },
    visa: {
      type: 'F-1',
      steps: [
        'Complete DS-160 form',
        'Pay SEVIS fee ($350)',
        'Schedule and attend visa interview',
      ],
      fee: '$350',
    },
    scholarships: [
      {
        name: 'Fulbright Scholarship',
        description: 'Full tuition for international students',
        eligibility: 'Academic excellence, leadership',
        link: 'https://foreign.fulbrightonline.org/',
      },
      {
        name: 'Harvard Financial Aid',
        description: 'Need-based aid for all admitted students',
        eligibility: 'Demonstrated financial need',
        link: 'https://college.harvard.edu/financial-aid',
      },
      {
        name: 'Boustany Foundation Scholarship',
        description: 'MBA scholarship for international students',
        eligibility: 'MBA applicants, strong academic record',
        link: 'https://www.boustany-foundation.org/scholarship-programs/mba-harvard/',
      },
    ],
  },
  {
    id: 'mit',
    name: 'Massachusetts Institute of Technology (MIT)',
    link: 'https://web.mit.edu/',
    logoSeed: 'mit',
    avgRating: 4.7,
    reviewCount: 12,
    admission: {
      requirements: 'Requires SAT/ACT, strong STEM background, essays',
      deadline: 'Jan 1',
      documents: ['Transcripts', 'Recommendation Letters', 'Essays'],
    },
    visa: {
      type: 'F-1',
      steps: [
        'Complete DS-160 form',
        'Pay SEVIS fee ($350)',
        'Schedule and attend visa interview',
      ],
      fee: '$350',
    },
    scholarships: [
      {
        name: 'MIT Scholarships',
        description: 'Need-based scholarships for undergraduates',
        eligibility: 'Demonstrated financial need',
        link: 'https://sfs.mit.edu/undergraduate-students/financial-aid/mit-scholarships/',
      },
      {
        name: 'Fulbright Scholarship',
        description: 'Full tuition for international students',
        eligibility: 'Academic excellence, leadership',
        link: 'https://foreign.fulbrightonline.org/',
      },
      {
        name: 'Legatum Fellowship',
        description: 'Entrepreneurship scholarship for MIT students',
        eligibility: 'Entrepreneurial focus',
        link: 'https://legatum.mit.edu/fellowship/',
      },
    ],
  },
  {
    id: 'stanford',
    name: 'Stanford University',
    link: 'https://www.stanford.edu/',
    logoSeed: 'stanford',
    avgRating: 4.6,
    reviewCount: 9,
    admission: {
      requirements: 'Requires SAT/ACT, essays, 2 recommendation letters',
      deadline: 'Jan 2',
      documents: ['Transcripts', 'Recommendation Letters', 'Essays'],
    },
    visa: {
      type: 'F-1',
      steps: [
        'Complete DS-160 form',
        'Pay SEVIS fee ($350)',
        'Schedule and attend visa interview',
      ],
      fee: '$350',
    },
    scholarships: [
      {
        name: 'Knight-Hennessy Scholars',
        description: 'Full funding for graduate study at Stanford',
        eligibility: 'Graduate applicants, leadership',
        link: 'https://knight-hennessy.stanford.edu/',
      },
      {
        name: 'Stanford GSB Fellowships',
        description: 'Fellowships for MBA students',
        eligibility: 'MBA applicants',
        link: 'https://www.gsb.stanford.edu/programs/mba/financial-aid/fellowships',
      },
      {
        name: 'Fulbright Scholarship',
        description: 'Full tuition for international students',
        eligibility: 'Academic excellence, leadership',
        link: 'https://foreign.fulbrightonline.org/',
      },
    ],
  },
  {
    id: 'oxford',
    name: 'University of Oxford',
    link: 'https://www.ox.ac.uk/',
    logoSeed: 'oxford',
    avgRating: 4.4,
    reviewCount: 8,
    admission: {
      requirements: 'A-levels or equivalent, admissions test, interview',
      deadline: 'Oct 15',
      documents: ['Transcripts', 'Recommendation Letters', 'Admissions Test'],
    },
    visa: {
      type: 'Student Visa (UK)',
      steps: [
        'Apply for CAS from Oxford',
        'Complete UK visa application',
        'Schedule and attend visa interview',
      ],
      fee: '£348',
    },
    scholarships: [
      {
        name: 'Rhodes Scholarship',
        description: 'Full funding for international students',
        eligibility: 'Exceptional academic achievement',
        link: 'https://www.rhodeshouse.ox.ac.uk/scholarships/',
      },
      {
        name: 'Clarendon Fund',
        description: 'Graduate scholarships for all nationalities',
        eligibility: 'Graduate applicants',
        link: 'https://www.ox.ac.uk/clarendon',
      },
      {
        name: 'Chevening Scholarship',
        description: 'UK government scholarship for international students',
        eligibility: 'Leadership, academic merit',
        link: 'https://www.chevening.org/',
      },
    ],
  },
  {
    id: 'cambridge',
    name: 'University of Cambridge',
    link: 'https://www.cam.ac.uk/',
    logoSeed: 'cambridge',
    avgRating: 4.3,
    reviewCount: 7,
    admission: {
      requirements: 'A-levels or equivalent, admissions test, interview',
      deadline: 'Oct 15',
      documents: ['Transcripts', 'Recommendation Letters', 'Admissions Test'],
    },
    visa: {
      type: 'Student Visa (UK)',
      steps: [
        'Apply for CAS from Cambridge',
        'Complete UK visa application',
        'Schedule and attend visa interview',
      ],
      fee: '£348',
    },
    scholarships: [
      {
        name: 'Gates Cambridge Scholarship',
        description: 'Full-cost scholarships for graduate study',
        eligibility: 'Graduate applicants, academic excellence',
        link: 'https://www.gatescambridge.org/',
      },
      {
        name: 'Cambridge International Scholarships',
        description: 'For international PhD students',
        eligibility: 'PhD applicants',
        link: 'https://www.cambridgetrust.org/scholarships/',
      },
      {
        name: 'Chevening Scholarship',
        description: 'UK government scholarship for international students',
        eligibility: 'Leadership, academic merit',
        link: 'https://www.chevening.org/',
      },
    ],
  },
];
