import { chromium, ElementHandle, Page } from "playwright";

const getAgencies = async () => {
  const response = await fetch("http://apis.accela.com/v4/search/agencies", {
    method: "POST",
    body: JSON.stringify({
      state: "CO",
    }),
    headers: {
      "Content-Type": "application/json",
      "x-accela-appid": "638817141498576008",
      "x-accela-appsecret": "fa2862ed1dfe4f77b32335e735519b3e",
    },
  });
  console.log(response);

  const data = await response.json();
  console.log(data);
};

const getAgencyDocuments = async (agency: string, environment: string) => {
  const response = await fetch(
    `http://apis.accela.com/v4/search/records?limit=10`,
    {
      method: "POST",
      headers: {
        "x-accela-appid": "638817141498576008",
        "x-accela-appsecret": "fa2862ed1dfe4f77b32335e735519b3e",
        "x-accela-agency": agency,
        "x-accela-environment": environment,
        "Content-Type": "application/json",
      },
    }
  );
  console.log(response);

  const data = await response.json();
  console.log(data);
  return data;
};

// it's browser automation time

const SEARCH_URL =
  "https://aca-prod.accela.com/DENVER/Cap/CapHome.aspx?module=Development";

const formatDateForInput = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
};

const performSearch = async (page: Page, startDate: Date, endDate: Date) => {
  await page.goto(SEARCH_URL);

  const permitTypeSelector = await page.waitForSelector(
    "select[name='ctl00$PlaceHolderMain$generalSearchForm$ddlGSPermitType']",
    { timeout: 10000 }
  );

  await permitTypeSelector.selectOption("Development/Building/Log/NA");

  // selecting a permit type triggers a page load
  // await page.waitForTimeout(2000);
  await page.waitForLoadState("networkidle");

  const startDateInput = await page.waitForSelector(
    "input[name='ctl00$PlaceHolderMain$generalSearchForm$txtGSStartDate']",
    { timeout: 500 }
  );
  await startDateInput.fill("");
  await page.waitForTimeout(100);
  await startDateInput.fill(formatDateForInput(startDate));

  const endDateInput = await page.waitForSelector(
    "input[name='ctl00$PlaceHolderMain$generalSearchForm$txtGSEndDate']",
    { timeout: 500 }
  );
  await endDateInput.fill("");
  await page.waitForTimeout(100);
  await endDateInput.fill(formatDateForInput(endDate));

  const searchButton = await page.waitForSelector(
    "a#ctl00_PlaceHolderMain_btnNewSearch",
    { timeout: 500 }
  );
  await searchButton.click();

  await page.waitForLoadState("networkidle");
};

const performRecordNumberSearch = async (
  page: Page,
  startDate: Date,
  endDate: Date
) => {
  await page.goto(SEARCH_URL);

  const permitTypeSelector = await page.waitForSelector(
    "select[name='ctl00$PlaceHolderMain$generalSearchForm$ddlGSPermitType']",
    { timeout: 10000 }
  );

  await permitTypeSelector.selectOption("Development/Building/Log/NA");

  // selecting a permit type triggers a page load
  // await page.waitForTimeout(2000);
  await page.waitForLoadState("networkidle");

  const startDateInput = await page.waitForSelector(
    "input[name='ctl00$PlaceHolderMain$generalSearchForm$txtGSStartDate']",
    { timeout: 500 }
  );
  await startDateInput.fill("");
  await page.waitForTimeout(100);
  await startDateInput.fill(formatDateForInput(startDate));

  const endDateInput = await page.waitForSelector(
    "input[name='ctl00$PlaceHolderMain$generalSearchForm$txtGSEndDate']",
    { timeout: 500 }
  );
  await endDateInput.fill("");
  await page.waitForTimeout(100);
  await endDateInput.fill(formatDateForInput(endDate));

  const searchButton = await page.waitForSelector(
    "a#ctl00_PlaceHolderMain_btnNewSearch",
    { timeout: 500 }
  );
  await searchButton.click();

  await page.waitForLoadState("networkidle");
};

// ctl00_PlaceHolderMain_dgvPermitList_gdvPermitList_ctl03_hlPermitNumber

// const getNextRecordLinkElement = async (page: Page) => {
//   return await page.waitForSelector(
//     "a#ctl00_PlaceHolderMain_dgvPermitList_gdvPermitList_ctl02_hlPermitNumber",
//     { timeout: 5000 }
//   );
// };

const downloadAttachmentsForRecord = async (
  page: Page,
  recordLinkElement: ElementHandle
) => {
  await recordLinkElement.click();
  await page.waitForLoadState("networkidle", { timeout: 20000 });

  const dropdownButton = await page.waitForSelector(
    'a[data-label="aca_CB1_recorddetail_section_label_recordinfo"]',
    {
      timeout: 5000,
    }
  );
  await dropdownButton.click();

  const attachmentTabButton = await page.waitForSelector(
    'a[href="#tab-attachments"]',
    {
      timeout: 5000,
    }
  );
  await attachmentTabButton.click();
  await page.waitForSelector(
    "iframe#ctl00_PlaceHolderMain_attachmentEdit_iframeAttachmentList",
    {
      timeout: 20000,
    }
  );
  console.log("iframe found");

  const frame = page.frameLocator(
    "iframe#ctl00_PlaceHolderMain_attachmentEdit_iframeAttachmentList"
  );

  // await page.waitForTimeout(10000);
  // await page
  //   .waitForSelector("table#attachmentList_gdvAttachmentList", {
  //     timeout: 10000,
  //     // state: "attached",
  //   })
  //   .catch(() => page.pause());
  // console.log("attachment table found");

  // const noRecordsFound = await frame.getByText("No records found.");
  // if ((await noRecordsFound.all()).some(async (el) => await el.isVisible())) {
  //   console.log("No records found.");
  //   page.pause();
  //   return;
  // }

  await page.waitForTimeout(1000);

  for (const i of [
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
  ]) {
    const attachmentLink = await frame.locator(
      `a#attachmentList_gdvAttachmentList_ctl${i}_lnkFileName`
    );

    if (!(await attachmentLink.isVisible())) {
      console.log("Reached end of attachments");
      break;
    }

    const downloadPromise = page.waitForEvent("download");
    await attachmentLink.click();
    const download = await downloadPromise;

    console.log("Downloading", download.suggestedFilename());
    download.saveAs("./temp/" + download.suggestedFilename());
  }
};

const getRecordLinkSelector = (index: string) =>
  `a#ctl00_PlaceHolderMain_dgvPermitList_gdvPermitList_ctl${index}_hlPermitNumber`;

const findBuildingLogAttachments = async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  context.setDefaultTimeout(10000);
  const page = await context.newPage();

  // await performSearch(
  //   searchPage,
  //   new Date("2024-01-01"),
  //   new Date("2024-01-05")
  // );

  await page.goto(SEARCH_URL);

  const recordNumberInput = await page.waitForSelector(
    "input#ctl00_PlaceHolderMain_generalSearchForm_txtGSPermitNumber",
    { timeout: 10000 }
  );

  await recordNumberInput.fill("2025-LOG-0000001");

  for (const i of [
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
  ]) {
    let retries = 0;
    while (retries < 1) {
      try {
        const recordPage = await context.newPage();
        await recordPage.goto(SEARCH_URL);
        const recordLinkElement = await recordPage.waitForSelector(
          getRecordLinkSelector(i),
          { timeout: 10000 }
        );

        await downloadAttachmentsForRecord(recordPage, recordLinkElement);
        await recordPage.close();
        break;
      } catch (e) {
        console.log("Error downloading attachments for record", i);
        console.log(e);
        retries++;
      }
    }
  }
};

const downloadAccelaDocuments = async () => {
  await findBuildingLogAttachments();
};

downloadAccelaDocuments().catch(console.error);
