import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TimeEntry {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  isBillable: boolean;
  note?: string;
  task: {
    title: string;
    project: {
      name: string;
    };
  };
  user: {
    name: string;
    email: string;
  };
}

interface ExportOptions {
  entries: TimeEntry[];
  workspaceName: string;
  dateRange: {
    start: string;
    end: string;
  };
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
}

export function exportTimeToPDF(options: ExportOptions) {
  const {
    entries,
    workspaceName,
    dateRange,
    totalHours,
    billableHours,
    nonBillableHours,
  } = options;

  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add header
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246); // Primary blue color
  doc.text("Time Report", pageWidth / 2, 20, { align: "center" });

  // Add workspace name
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(workspaceName, pageWidth / 2, 28, { align: "center" });

  // Add date range
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  const startDate = new Date(dateRange.start).toLocaleDateString();
  const endDate = new Date(dateRange.end).toLocaleDateString();
  doc.text(`${startDate} - ${endDate}`, pageWidth / 2, 35, {
    align: "center",
  });

  // Summary statistics box
  doc.setFillColor(249, 250, 251);
  doc.rect(15, 42, pageWidth - 30, 25, "F");

  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);

  const summaryY = 50;
  const col1X = 25;
  const col2X = 85;
  const col3X = 145;

  // Total Hours
  doc.setFont("helvetica", "bold");
  doc.text("Total Hours:", col1X, summaryY);
  doc.setFont("helvetica", "normal");
  doc.text(totalHours.toFixed(2), col1X, summaryY + 6);

  // Billable Hours
  doc.setFont("helvetica", "bold");
  doc.text("Billable:", col2X, summaryY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(16, 185, 129); // Green
  doc.text(billableHours.toFixed(2), col2X, summaryY + 6);

  // Non-Billable Hours
  doc.setFont("helvetica", "bold");
  doc.setTextColor(75, 85, 99);
  doc.text("Non-Billable:", col3X, summaryY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(239, 68, 68); // Red
  doc.text(nonBillableHours.toFixed(2), col3X, summaryY + 6);

  // Prepare table data
  const tableData = entries.map((entry) => {
    const date = new Date(entry.startTime).toLocaleDateString();
    const start = new Date(entry.startTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const end = new Date(entry.endTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const hours = (entry.duration / 3600).toFixed(2);
    const billable = entry.isBillable ? "✓" : "✗";

    return [
      date,
      entry.task.project.name,
      entry.task.title,
      `${start} - ${end}`,
      hours,
      billable,
      entry.note || "-",
    ];
  });

  // Add table
  autoTable(doc, {
    head: [["Date", "Project", "Task", "Time", "Hours", "Billable", "Notes"]],
    body: tableData,
    startY: 75,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 22 }, // Date
      1: { cellWidth: 30 }, // Project
      2: { cellWidth: 35 }, // Task
      3: { cellWidth: 28 }, // Time
      4: { cellWidth: 15 }, // Hours
      5: { cellWidth: 15 }, // Billable
      6: { cellWidth: 35 }, // Notes
    },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages();
      const pageNumber = doc.getCurrentPageInfo().pageNumber;

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" },
      );

      // Add timestamp
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth - 15,
        doc.internal.pageSize.getHeight() - 10,
        { align: "right" },
      );
    },
  });

  // Save the PDF
  const filename = `time-report-${dateRange.start}-to-${dateRange.end}.pdf`;
  doc.save(filename);
}
