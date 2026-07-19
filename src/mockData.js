export const PRESETS = [
  {
    id: 'email-1',
    label: 'University Email (Computer Networks)',
    course: 'Computer Networks',
    text: `Subject: COMP_NET_402: Assignment 3 and Quiz 2 Schedule
From: prof.richards@university.edu
Date: July 19, 2026

Hi Class,

Please note that Assignment 3 (Routing Protocols Implementation) is due on July 24th, 2026 at 11:59 PM. It is a high-priority assignment worth 10% of your grade. 

Additionally, Quiz 2 covering Congestion Control will open on July 28th, 2026 from 9:00 AM to 5:00 PM. Please ensure you submit it on time.

Best,
Prof. Richards`
  },
  {
    id: 'discord-1',
    label: 'Discord Announcement (Software Engineering)',
    course: 'Software Engineering',
    text: `[10:14 AM] TAs_Support: @everyone Hey guys, reminder that the Software Engineering Project Prototype (Milestone 2) needs to be submitted by July 26th, 2026. This is urgent. Make sure your GitHub repos are updated.
[10:15 AM] student_abc: is it due at midnight?
[10:15 AM] TAs_Support: Yes, 11:59 PM. Also, the peer review feedback forms must be completed by July 29th, 2026 (Medium priority).`
  },
  {
    id: 'whatsapp-1',
    label: 'WhatsApp Chat (Artificial Intelligence)',
    course: 'Artificial Intelligence',
    text: `[14:32, 19/07/2026] CR Rohit: Guys, AI Prof just messaged. The Midterm Exam syllabus is Units 1 to 3. The exam is scheduled for July 30th, 2026, from 10:00 AM to 12:00 PM. Attendance is compulsory!
[14:34, 19/07/2026] Yash: Is it MCQ or written?
[14:35, 19/07/2026] CR Rohit: Written, 50 marks. Low-stress but study hard.`
  }
];

export const INITIAL_DEADLINES = [
  {
    id: 'dl-1',
    course: 'Computer Networks',
    title: 'Lab 2: Subnetting and IP Addressing',
    description: 'Configure static routing, RIP, and OSPF in Cisco Packet Tracer. Document routing tables.',
    dueDate: '2026-07-22T23:59:00',
    urgency: 'High',
    status: 'Pending'
  },
  {
    id: 'dl-2',
    course: 'Software Engineering',
    title: 'SRS Documentation Submission',
    description: 'Submit the completed Software Requirements Specification document for the team project.',
    dueDate: '2026-07-25T18:00:00',
    urgency: 'Medium',
    status: 'Pending'
  },
  {
    id: 'dl-3',
    course: 'Database Management Systems',
    title: 'Quiz 1: Relational Algebra & SQL Queries',
    description: 'Online Moodle quiz covering SQL joins, aggregation queries, and schema constraints.',
    dueDate: '2026-07-20T12:00:00',
    urgency: 'High',
    status: 'Completed'
  },
  {
    id: 'dl-4',
    course: 'Distributed Systems',
    title: 'Research Paper Critique',
    description: 'Submit a 2-page summary and critique of the MapReduce foundational paper.',
    dueDate: '2026-08-05T23:59:00',
    urgency: 'Low',
    status: 'Pending'
  }
];

export const COURSES = [
  'Computer Networks',
  'Software Engineering',
  'Database Management Systems',
  'Artificial Intelligence',
  'Distributed Systems'
];

/**
 * A client-side mock LLM parsing function that simulates the extraction of deadlines using simple heuristics.
 */
export function simulateAgentParser(text, selectedCourse) {
  const deadlines = [];
  const lines = text.split('\n');

  // Let's perform key-value parsing based on keywords
  // We can look for sentences containing indicators like 'due', 'submit', 'exam', 'quiz', 'deadline'
  // Or extract standard patterns.
  
  // Custom heuristics for presets
  if (text.includes('COMP_NET_402: Assignment 3')) {
    deadlines.push({
      id: `dl-parsed-${Date.now()}-1`,
      course: 'Computer Networks',
      title: 'Assignment 3: Routing Protocols Implementation',
      description: 'Implement link-state and distance-vector algorithms in Python. Worth 10% of grade.',
      dueDate: '2026-07-24T23:59:00',
      urgency: 'High',
      status: 'Pending'
    });
    deadlines.push({
      id: `dl-parsed-${Date.now()}-2`,
      course: 'Computer Networks',
      title: 'Quiz 2: Congestion Control',
      description: 'Online test covering TCP Tahoe/Reno congestion windows and flow control.',
      dueDate: '2026-07-28T17:00:00',
      urgency: 'Medium',
      status: 'Pending'
    });
    return deadlines;
  }

  if (text.includes('Project Prototype (Milestone 2)')) {
    deadlines.push({
      id: `dl-parsed-${Date.now()}-1`,
      course: 'Software Engineering',
      title: 'Project Prototype (Milestone 2)',
      description: 'Submit working frontend-backend prototype with basic crud operations. Update GitHub repo.',
      dueDate: '2026-07-26T23:59:00',
      urgency: 'High',
      status: 'Pending'
    });
    deadlines.push({
      id: `dl-parsed-${Date.now()}-2`,
      course: 'Software Engineering',
      title: 'Peer Review Feedback Forms',
      description: 'Complete peer review grading forms for teammate contributions.',
      dueDate: '2026-07-29T23:59:00',
      urgency: 'Medium',
      status: 'Pending'
    });
    return deadlines;
  }

  if (text.includes('Midterm Exam syllabus')) {
    deadlines.push({
      id: `dl-parsed-${Date.now()}-1`,
      course: 'Artificial Intelligence',
      title: 'Midterm Exam (Units 1-3)',
      description: 'In-person written exam covering search algorithms, heuristics, and logic. 50 marks.',
      dueDate: '2026-07-30T10:00:00',
      urgency: 'High',
      status: 'Pending'
    });
    return deadlines;
  }

  // Generic backup parser based on text lines
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();
    const hasDeadlineKeyword = lowerLine.includes('due') || 
                               lowerLine.includes('submit') || 
                               lowerLine.includes('exam') || 
                               lowerLine.includes('quiz') || 
                               lowerLine.includes('milestone') || 
                               lowerLine.includes('assignment');

    if (hasDeadlineKeyword) {
      // Determine title
      let title = 'Parsed Event';
      if (lowerLine.includes('assignment')) {
        title = 'Assignment Submission';
      } else if (lowerLine.includes('quiz')) {
        title = 'Quiz Deadline';
      } else if (lowerLine.includes('exam')) {
        title = 'Exam Date';
      } else if (lowerLine.includes('milestone')) {
        title = 'Project Milestone';
      }

      // Try to find a date
      // Default due date: 5 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 5);
      defaultDate.setHours(23, 59, 0, 0);

      // Determine urgency
      let urgency = 'Medium';
      if (lowerLine.includes('high') || lowerLine.includes('urgent') || lowerLine.includes('compulsory') || lowerLine.includes('important')) {
        urgency = 'High';
      } else if (lowerLine.includes('low') || lowerLine.includes('minor') || lowerLine.includes('optional')) {
        urgency = 'Low';
      }

      deadlines.push({
        id: `dl-parsed-${Date.now()}-${i}`,
        course: selectedCourse || 'General Academic',
        title: title,
        description: line.length > 100 ? line.substring(0, 100) + '...' : line,
        dueDate: defaultDate.toISOString().slice(0, 19),
        urgency: urgency,
        status: 'Pending'
      });
      found = true;
    }
  }

  // If nothing matches, create one fallback item
  if (!found) {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    defaultDate.setHours(23, 59, 0, 0);
    deadlines.push({
      id: `dl-parsed-${Date.now()}-fallback`,
      course: selectedCourse || 'General Academic',
      title: 'Parsed Syllabus Event',
      description: text.length > 80 ? text.substring(0, 80) + '...' : text,
      dueDate: defaultDate.toISOString().slice(0, 19),
      urgency: 'Medium',
      status: 'Pending'
    });
  }

  return deadlines;
}

export const MOCK_TEAMS_MESSAGES = [
  {
    id: 'msg-teams-1',
    sender: 'Prof. Miller (Distributed Systems)',
    timestamp: '2026-07-19T10:11:00',
    text: 'Hello Team, the Distributed Systems Midterm Exam is finalized. It is scheduled for July 30th, 2026, from 2:00 PM to 4:00 PM in Exam Hall 2. High priority exam, worth 30% of grade. Syllabus covers lectures 1 to 12.'
  },
  {
    id: 'msg-teams-2',
    sender: 'TA Sarah (Software Engineering)',
    timestamp: '2026-07-19T11:42:00',
    text: 'Friendly reminder that Software Engineering Milestone 3 (Database Schema & API endpoints) is due on August 2nd, 2026 at 11:59 PM. Please upload your documents via GitHub. (Medium priority).'
  }
];

export function simulateTeamsParser(messageText) {
  const deadlines = [];
  if (messageText.includes('Distributed Systems Midterm Exam')) {
    deadlines.push({
      id: `dl-teams-${Date.now()}-1`,
      course: 'Distributed Systems',
      title: 'Midterm Exam (Lectures 1-12)',
      description: 'In-person written exam in Exam Hall 2. Covers distributed algorithms, consensus, and time.',
      dueDate: '2026-07-30T14:00:00',
      urgency: 'High',
      status: 'Pending'
    });
  } else if (messageText.includes('Software Engineering Milestone 3')) {
    deadlines.push({
      id: `dl-teams-${Date.now()}-2`,
      course: 'Software Engineering',
      title: 'Milestone 3: Database & API',
      description: 'Submit working database schemas and API endpoints. Update GitHub repository.',
      dueDate: '2026-08-02T23:59:00',
      urgency: 'Medium',
      status: 'Pending'
    });
  } else {
    // Generic fallback for custom Teams message
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 4);
    defaultDate.setHours(23, 59, 0, 0);
    deadlines.push({
      id: `dl-teams-${Date.now()}-generic`,
      course: 'Software Engineering',
      title: 'Microsoft Teams Activity Log Target',
      description: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
      dueDate: defaultDate.toISOString().slice(0, 19),
      urgency: 'Medium',
      status: 'Pending'
    });
  }
  return deadlines;
}


// Generate simple mock ingest log history
export const MOCK_INGEST_LOGS = [
  {
    id: 'log-1',
    timestamp: '2026-07-19T10:15:23',
    source: 'Discord API Webhook',
    status: 'Success',
    message: 'Parsed 2 events for Software Engineering from channel #announcements.'
  },
  {
    id: 'log-2',
    timestamp: '2026-07-19T11:02:45',
    source: 'Gmail IMAP Sync',
    status: 'Success',
    message: 'Processed subject: "COMP_NET_402: Assignment 3 and Quiz 2". 2 deadlines extracted.'
  },
  {
    id: 'log-3',
    timestamp: '2026-07-19T14:36:11',
    source: 'Manual Paste',
    status: 'Success',
    message: 'Parsed 1 event for Artificial Intelligence from paste buffer.'
  },
  {
    id: 'log-4',
    timestamp: '2026-07-19T16:20:00',
    source: 'Outlook Integration',
    status: 'Warning',
    message: 'Email from prof.jones@university.edu scanned: No explicit due dates found.'
  }
];

// Generate mock calendar export logs
export const MOCK_EXPORT_LOGS = [
  {
    id: 'exp-1',
    timestamp: '2026-07-19T12:00:10',
    format: 'iCalendar (.ics)',
    itemCount: 4,
    status: 'Downloaded Client-side',
    destination: 'User Local Disk'
  },
  {
    id: 'exp-2',
    timestamp: '2026-07-19T15:45:30',
    format: 'iCalendar (.ics)',
    itemCount: 5,
    status: 'Downloaded Client-side',
    destination: 'User Local Disk'
  }
];
