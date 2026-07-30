import type { Metadata } from "next";
import { DeveloperReviewPortal } from "@/components/admin/DeveloperReviewPortal";
export const metadata:Metadata={title:"Developer Reviews | Uniblex Admin",robots:{index:false,follow:false}};
export default function DeveloperReviewPage(){return <DeveloperReviewPortal/>;}
